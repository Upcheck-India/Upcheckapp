import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CropsService } from '../crops/crops.service';
import { PondsService } from '../ponds/ponds.service';
import { BiosecurityService, SeedHealth } from '../crops/biosecurity.service';
import { HarvestsService } from '../harvests/harvests.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { ComplianceService, CycleCompliance } from '../compliance/compliance.service';
import { isMissingSchema } from '../pond-context/pond-context.service';
import { istDayRangeUtc } from '../common/ist-date';
import { ReportsService } from './reports.service';

/**
 * The cycle input record (disease spec D4): one cycle's inputs and health
 * facts, for a processor or buyer. It leaves the farm, so:
 *  - only an owner or a manager may generate it (READ at the route, bare role
 *    here — not overridable, like OWNER_ONLY);
 *  - NO money: no prices, costs or sale totals, every field picked explicitly.
 * `null` everywhere means "not logged", never zero.
 */
export interface InputRecord {
  cropId: string;
  farm: { name: string | null; caaRegistrationNo: string | null };
  pond: { name: string | null; areaM2: number | null };
  cycle: {
    name: string | null;
    cropCode: string | null;
    hatchery: string | null;
    stockingDate: string | null;
    stockingCount: number | null;
    endDate: string | null;
  };
  seed: SeedHealth | null;
  treatments: {
    date: string;
    category: string | null;
    ingredientKeys: string[];
    productName: string | null;
    description: string | null;
    doseValue: number | null;
    doseUnit: string | null;
    reason: string | null;
    flag: string;
    matches: string[];
  }[];
  feedBrands: string[];
  health: {
    diseases: {
      date: string;
      name: string | null;
      confirmedBy: string | null;
      labName: string | null;
      outcome: string | null;
    }[];
    mortality: { records: number; count: number } | null;
    doBelow3Days: { days: number; of: number } | null;
  };
  antimicrobial: Pick<CycleCompliance, 'status' | 'items' | 'listVersion'>;
  harvests: {
    date: string;
    type: string | null;
    weightKg: number;
    grades: { countPerKg: number | null; weightKg: number }[];
  }[];
}

const num = (v: unknown): number | null =>
  v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

@Injectable()
export class InputRecordService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly crops: CropsService,
    private readonly ponds: PondsService,
    private readonly biosecurity: BiosecurityService,
    private readonly harvestsService: HarvestsService,
    private readonly farmAccess: FarmAccessService,
    private readonly compliance: ComplianceService,
    private readonly reports: ReportsService,
  ) {}

  private q = (sql: string, params: unknown[]) => this.dataSource.query(sql, params);

  /** A column/table from a not-yet-applied migration → the fallback. */
  private tolerant = <T>(p: Promise<T>, fallback: () => Promise<T> | T) =>
    p.catch((err) => {
      if (isMissingSchema(err)) return fallback();
      throw err;
    });

  async forCrop(cropId: string, userId: string): Promise<InputRecord> {
    const crop = await this.crops.findOneAccessible(cropId, userId, 'READ');
    const pond = await this.ponds.findOneAccessible(crop.pondId, userId, 'READ');
    const role = await this.farmAccess.getRoleOnFarm(userId, pond.farmId);
    if (role !== 'owner' && role !== 'manager') {
      throw new ForbiddenException(
        'Only the farm owner or a manager can generate the cycle input record',
      );
    }

    const result = await this.reports.getCycleResult(cropId, userId);
    const stockingDay = result.stockingDate;
    const window = {
      start: istDayRangeUtc(stockingDay ?? result.endDate).start,
      end: istDayRangeUtc(result.endDate).end,
    };

    const [farmRows, hatcheryRows, bio, treatments, feedBrands, diseases, mortality, compliance, harvests] =
      await Promise.all([
        this.tolerant(
          this.q(`SELECT name, caa_registration_no AS caa FROM farms WHERE id = $1`, [pond.farmId]),
          () => this.q(`SELECT name, NULL AS caa FROM farms WHERE id = $1`, [pond.farmId]),
        ),
        this.q(
          `SELECT h.name FROM crops c JOIN hatcheries h ON h.id = c.hatchery_id WHERE c.id = $1`,
          [cropId],
        ),
        this.biosecurity.read(cropId),
        this.tolerant(
          this.q(
            `SELECT treatment_date::text AS date, category, ingredient_keys AS "ingredientKeys",
                    product_name AS "productName", description, dose_value AS "doseValue",
                    dose_unit AS "doseUnit", dosage_kg AS "dosageKg", reason,
                    banned_substance_flag AS flag, banned_substance_matches AS matches
               FROM treatments WHERE crop_id = $1 ORDER BY treatment_date, created_at`,
            [cropId],
          ),
          // Pre-D2 schema: free text + kg only.
          () =>
            this.q(
              `SELECT treatment_date::text AS date, description, dosage_kg AS "dosageKg",
                      banned_substance_flag AS flag, banned_substance_matches AS matches
                 FROM treatments WHERE crop_id = $1 ORDER BY treatment_date, created_at`,
              [cropId],
            ),
        ),
        // Older builds logged feed without crop_id: the pond's untagged rows
        // inside the cycle window count too (same rule as Cycle Result C2).
        this.q(
          `SELECT DISTINCT btrim(feed_brand) AS brand FROM feed_records
            WHERE nullif(btrim(feed_brand), '') IS NOT NULL
              AND (crop_id = $1 OR (crop_id IS NULL AND pond_id = $2 AND recorded_at BETWEEN $3 AND $4))
            ORDER BY 1`,
          [cropId, crop.pondId, window.start, window.end],
        ),
        this.tolerant(
          this.q(
            `SELECT r.recorded_date::text AS date, l.name, r.confirmed_by AS "confirmedBy",
                    r.lab_name AS "labName", r.outcome
               FROM disease_records r LEFT JOIN disease_library l ON l.id = r.disease_id
              WHERE r.crop_id = $1 ORDER BY r.recorded_date`,
            [cropId],
          ),
          () =>
            this.q(
              `SELECT r.recorded_date::text AS date, l.name, NULL AS "confirmedBy",
                      NULL AS "labName", NULL AS outcome
                 FROM disease_records r LEFT JOIN disease_library l ON l.id = r.disease_id
                WHERE r.crop_id = $1 ORDER BY r.recorded_date`,
              [cropId],
            ),
        ),
        this.q(
          `SELECT COUNT(*)::int AS records, COALESCE(SUM(quantity), 0)::int AS count
             FROM mortality_records WHERE crop_id = $1`,
          [cropId],
        ),
        this.compliance.cycleCompliance(cropId),
        this.harvestsService.findAll(userId, cropId),
      ]);

    const farm = farmRows[0] ?? {};
    const m = mortality[0];
    const area = num(pond.overrideAreaM2 ?? pond.calculatedAreaM2);

    return {
      cropId,
      farm: { name: farm.name ?? null, caaRegistrationNo: farm.caa ?? null },
      pond: { name: pond.displayName ?? pond.name ?? null, areaM2: area && area > 0 ? area : null },
      cycle: {
        name: crop.name ?? null,
        cropCode: crop.cropCode ?? null,
        hatchery: hatcheryRows[0]?.name ?? null,
        stockingDate: stockingDay,
        stockingCount: crop.stockingCount ?? crop.totalSeed ?? null,
        endDate: result.endDate,
      },
      seed: bio.seed,
      treatments: (treatments as any[]).map((r) => ({
        date: String(r.date).slice(0, 10),
        category: r.category ?? null,
        ingredientKeys: r.ingredientKeys ?? [],
        productName: r.productName ?? null,
        description: r.description ?? null,
        // Pre-D2 rows carry kg only.
        doseValue: num(r.doseValue) ?? num(r.dosageKg),
        doseUnit: r.doseUnit ?? (num(r.dosageKg) != null ? 'kg' : null),
        reason: r.reason ?? null,
        flag: r.flag ?? 'none',
        matches: r.matches ?? [],
      })),
      feedBrands: (feedBrands as any[]).map((r) => r.brand),
      health: {
        diseases: diseases as InputRecord['health']['diseases'],
        mortality: m && m.records > 0 ? { records: m.records, count: m.count } : null,
        doBelow3Days: result.welfare.doBelow3Days,
      },
      antimicrobial: {
        status: compliance.status,
        items: compliance.items,
        listVersion: compliance.listVersion,
      },
      // Discarded lots never left the farm as product. Prices are dropped
      // here on purpose — pick, never spread.
      harvests: (harvests as any[])
        .filter((h) => h.status !== 'discarded')
        .map((h) => ({
          date: String(h.harvestDate).slice(0, 10),
          type: h.harvestType ?? null,
          weightKg: Number(h.weightKg) || 0,
          grades: (h.grades ?? []).map((g: any) => ({
            countPerKg: num(g.countPerKg),
            weightKg: Number(g.weightKg) || 0,
          })),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
