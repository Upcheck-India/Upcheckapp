import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { Harvest } from './harvest.entity';
import { Crop } from '../crops/crop.entity';
import { Pond } from '../ponds/pond.entity';
import { HarvestPlan } from '../harvest-plans/harvest-plan.entity';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { GradeDto } from './dto/grade.dto';
import { CropsService } from '../crops/crops.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { toIstDateString } from '../common/ist-date';
import { harvestTotals, HarvestTotals } from './harvest-totals';
import { isMissingSchema } from '../pond-context/pond-context.service';

/** A stored grade line as the API returns it. */
export interface HarvestGrade {
  id: string;
  countPerKg: number | null;
  weightKg: number;
  pricePerKg: number | null;
}

/**
 * The H1 fields that live outside the entity (see harvest.entity.ts). A
 * harvest with `grades: []` is an old, ungraded one: readers treat it as one
 * implicit line of `weightKg` at `salePriceTotal`.
 */
export interface HarvestDetails {
  grades: HarvestGrade[];
  rejectedKg: number | null;
  rejectedReason: string | null;
  pieces: number | null;
  piecesEstimated: boolean;
}

/** ₹/kg outside this band is a warning the client must confirm (warn, not block). */
export const PRICE_BAND = { min: 50, max: 2000 } as const;

type GradeLine = { id?: string; countPerKg: number | null; weightKg: number; pricePerKg: number | null };

/** Warn-not-block (daily-logging D4): a 400 the client turns into a confirm. */
export function assertPriceBand(lines: GradeLine[], confirmed?: boolean): void {
  if (confirmed) return;
  const out = lines.find(
    (g) =>
      g.pricePerKg != null &&
      (g.pricePerKg < PRICE_BAND.min || g.pricePerKg > PRICE_BAND.max),
  );
  if (out) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'OUT_OF_RANGE',
      field: 'pricePerKg',
      value: out.pricePerKg,
      range: PRICE_BAND,
      message: `₹${out.pricePerKg}/kg is outside ₹${PRICE_BAND.min}–${PRICE_BAND.max}/kg. Send confirmOutOfRange to keep it.`,
    });
  }
}

/** A harvest happens on or before today (IST), and not before stocking. */
export function assertHarvestDate(
  harvestDate: string,
  stockingDate: unknown,
  now: Date = new Date(),
): void {
  const day = harvestDate.slice(0, 10);
  if (day > toIstDateString(now)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'HARVEST_DATE_FUTURE',
      message: 'A harvest date cannot be in the future.',
    });
  }
  if (stockingDate && day < asDateString(stockingDate)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'HARVEST_DATE_BEFORE_STOCKING',
      message: 'A harvest date cannot be before the cycle was stocked.',
    });
  }
}

/**
 * A harvest sale, projected into the shape the Money tab's entry list renders.
 *
 * `id` is deliberately NOT a transaction id — it is prefixed, and `source` says
 * what it is — so the UI cannot offer edit/delete on a row that has no
 * transaction behind it.
 */
export interface HarvestMoneyEntry {
  id: string;
  source: 'harvest';
  farmId: string;
  transactionDate: string;
  type: 'income';
  category: string;
  amount: number;
  description: string;
  buyerName?: string;
  weightKg?: number;
  pondId: string | null;
  pondName: string | null;
  /** The pond this sale came from is retired. Marked, never hidden (D3). */
  archived: boolean;
}

const asDateString = (d: unknown): string =>
  typeof d === 'string' ? d.slice(0, 10) : toIstDateString(new Date(d as any));

/**
 * A sale price and buyer are financials. Every harvest read that can reach a
 * member without VIEW_FINANCIALS goes through this — masked, not dropped, so
 * the member still gets the weights.
 */
export const maskFinancials = <
  T extends Pick<Harvest, 'salePriceTotal' | 'buyerName'> & {
    grades?: { pricePerKg: number | null }[];
  },
>(
  row: T,
  canView: boolean,
): T =>
  canView
    ? row
    : {
        ...row,
        salePriceTotal: null,
        buyerName: null,
        ...(row.grades
          ? { grades: row.grades.map((g) => ({ ...g, pricePerKg: null })) }
          : {}),
      };

@Injectable()
export class HarvestsService {
  constructor(
    @InjectRepository(Harvest)
    private harvestsRepository: Repository<Harvest>,
    private cropsService: CropsService,
    private readonly farmAccess: FarmAccessService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateHarvestDto, userId: string) {
    // Idempotent replay guard — a queued-then-retried harvest must not
    // double-insert or run closeCycle twice (double-counting biomass/revenue).
    // Verify the caller can access the found row's farm BEFORE returning it so
    // a replay with a guessed id can't leak another farm's harvest.
    if (createDto.id) {
      const existing = await this.harvestsRepository.findOne({
        where: { id: createDto.id },
        relations: ['crop'],
      });
      if (existing) {
        await this.farmAccess.assertCanAccessPond(
          userId,
          existing.crop.pondId,
          'RECORD_HARVEST',
        );
        return maskFinancials(
          await this.withDetails(existing),
          await this.canViewFinancials(userId, existing.crop.pondId),
        );
      }
    }

    // A harvest closes a cycle and books revenue — it is not a pH reading, and
    // it does not ride WRITE_OPERATIONAL. Owner/manager by default; an owner
    // can grant it to a role or to one person (roleSatisfies resolves both).
    const crop = await this.cropsService.findOneAccessible(
      createDto.cropId,
      userId,
    );
    await this.farmAccess.assertCanAccessPond(
      userId,
      crop.pondId,
      'RECORD_HARVEST',
    );
    const canView = await this.canViewFinancials(userId, crop.pondId);

    const {
      grades,
      rejectedKg,
      rejectedReason,
      confirmOutOfRange,
      planId,
      ...fields
    } = createDto;
    // A price is money: without VIEW_FINANCIALS it is stripped, not refused —
    // the manager weighs at the pond, the owner adds the price later (H1).
    if (!canView) delete fields.salePriceTotal;
    const lines = grades ? this.cleanGrades(grades, canView) : null;
    if (lines) assertPriceBand(lines, confirmOutOfRange);

    // One transaction: lock the crop, refuse a closed cycle BEFORE inserting,
    // insert, and (for a full harvest) close the cycle. It used to save the row
    // and THEN let closeCycle 409 — an orphan harvest the user retried into a
    // duplicate (saveRecord mints a new id per attempt).
    const saved = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(Crop, {
        where: { id: createDto.cropId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.status !== 'active') {
        throw new ConflictException({
          statusCode: 409,
          code: 'CYCLE_CLOSED',
          message: 'This cycle is already closed.',
        });
      }
      assertHarvestDate(createDto.harvestDate, locked.stockingDate);

      // Graded: the row is the aggregate of its lines, derived here — the
      // client's weightKg / salePriceTotal are ignored. Ungraded (old app
      // builds): the old single-total path, untouched.
      let totals: HarvestTotals | null = null;
      if (lines) {
        totals = harvestTotals(
          lines,
          await this.abwAt(manager, createDto.cropId, createDto.harvestDate),
        );
        Object.assign(fields, {
          weightKg: totals.weightKg,
          salePriceTotal: totals.salePriceTotal,
          averageSize: totals.averageSize,
        });
      }

      if (planId) await this.completePlanWith(manager, planId, locked.pondId, fields);

      const row = await manager.save(
        manager.create(Harvest, { ...fields, createdById: userId }),
      );
      await this.writeDetails(manager, row.id, lines, totals, rejectedKg, rejectedReason);
      if (planId) {
        // Needs migration 1780701000000 — only clients that send planId get here.
        await manager.query(`UPDATE harvests SET plan_id = $2 WHERE id = $1`, [
          row.id,
          planId,
        ]);
      }
      if (createDto.harvestType === 'full') {
        await this.cropsService.closeCycle(
          createDto.cropId,
          createDto.harvestDate,
          userId,
          manager,
        );
      }
      return row;
    });

    return maskFinancials(await this.withDetails(saved), canView);
  }

  /**
   * H4 — the harvest completes its plan, in the harvest's own transaction.
   * The conditional update is scoped to the harvested crop's pond and to a
   * still-planned plan, so a double submit (two harvest ids) completes it
   * once: the second gets 409 and, rolled back with it, writes no harvest.
   */
  private async completePlanWith(
    manager: EntityManager,
    planId: string,
    pondId: string,
    fields: { harvestDate: string; weightKg?: number; salePriceTotal?: number | null },
  ): Promise<void> {
    const plan = await manager.findOne(HarvestPlan, {
      where: { id: planId },
      select: { id: true, pondId: true, status: true },
    });
    if (!plan || plan.pondId !== pondId) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PLAN_WRONG_POND',
        message: 'This harvest plan belongs to another pond.',
      });
    }
    const revenue = fields.salePriceTotal ?? null;
    const kg = Number(fields.weightKg) || 0;
    const res = await manager.update(
      HarvestPlan,
      { id: planId, pondId, status: 'planned' },
      {
        status: 'completed',
        actualHarvestDate: fields.harvestDate.slice(0, 10) as any,
        actualWeightKg: kg,
        actualRevenue: revenue as any,
        actualPricePerKg: (revenue != null && kg > 0
          ? Math.round((revenue / kg) * 100) / 100
          : null) as any,
      },
    );
    if (!res.affected) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PLAN_ALREADY_COMPLETED',
        message: 'This harvest plan is already completed.',
      });
    }
  }

  /**
   * Cycles of this farm that carry BOTH a plan-completion income transaction
   * (pre-H4 `/complete`, category harvest_sale) and a sold harvest. The farm
   * report sums both, so this is possibly the same sale counted twice. H4
   * does not rewrite production money rows; it flags them for the farmer.
   */
  async planIncomeOverlaps(
    farmId: string,
  ): Promise<{ cropId: string; pondId: string }[]> {
    return this.harvestsRepository.query(
      `SELECT DISTINCT hp.crop_id AS "cropId", hp.pond_id AS "pondId"
         FROM transactions t
         JOIN harvest_plans hp ON t.description = 'Harvest sale from plan ' || hp.id::text
        WHERE t.farm_id = $1 AND t.type = 'income' AND t.category = 'harvest_sale'
          AND hp.crop_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM harvests h
                       WHERE h.crop_id = hp.crop_id AND h.status = 'sold')`,
      [farmId],
    );
  }

  /** Normalise grade lines; drop prices the caller may not set. */
  private cleanGrades(grades: GradeDto[], canView: boolean): GradeLine[] {
    return grades.map((g) => ({
      id: g.id,
      countPerKg: g.countPerKg ?? null,
      weightKg: g.weightKg,
      pricePerKg: canView ? (g.pricePerKg ?? null) : null,
    }));
  }

  /** Latest weighed ABW on or before the harvest day (for estimated pieces). */
  private async abwAt(
    manager: EntityManager,
    cropId: string,
    day: string,
  ): Promise<number | null> {
    const [row] = await manager.query(
      `SELECT mbw_g::float AS mbw FROM sampling_data
        WHERE crop_id = $1 AND mbw_g IS NOT NULL AND sampling_date <= $2
        ORDER BY sampling_date DESC LIMIT 1`,
      [cropId, day.slice(0, 10)],
    );
    return row?.mbw != null ? Number(row.mbw) : null;
  }

  /**
   * Write the H1 fields that live outside the entity. `lines` replaces ALL
   * grade lines (no-op on a fresh harvest); `undefined` rejected fields are
   * left alone, `null` clears them. Runs inside the caller's transaction.
   * Needs migration 1780700900000 — only reached by clients that send H1
   * fields, so old app builds never touch it.
   */
  private async writeDetails(
    manager: EntityManager,
    harvestId: string,
    lines: GradeLine[] | null,
    totals: HarvestTotals | null,
    rejectedKg: number | null | undefined,
    rejectedReason: string | null | undefined,
  ): Promise<void> {
    if (lines) {
      await manager.query(`DELETE FROM harvest_grades WHERE harvest_id = $1`, [
        harvestId,
      ]);
      const params: unknown[] = [harvestId];
      const values = lines.map((g, i) => {
        params.push(g.id ?? null, g.countPerKg, g.weightKg, g.pricePerKg, i);
        const b = params.length - 5;
        return `(COALESCE($${b + 1}::uuid, gen_random_uuid()), $1, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
      });
      await manager.query(
        `INSERT INTO harvest_grades (id, harvest_id, count_per_kg, weight_kg, price_per_kg, sort_order)
         VALUES ${values.join(', ')}`,
        params,
      );
    }
    const sets: string[] = [];
    const params: unknown[] = [harvestId];
    const set = (col: string, v: unknown) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    if (totals) {
      set('pieces', totals.pieces);
      set('pieces_estimated', totals.piecesEstimated);
    }
    if (rejectedKg !== undefined) set('rejected_kg', rejectedKg);
    if (rejectedReason !== undefined) set('rejected_reason', rejectedReason);
    if (sets.length) {
      await manager.query(
        `UPDATE harvests SET ${sets.join(', ')} WHERE id = $1`,
        params,
      );
    }
  }

  /**
   * Attach the H1 fields to entity rows, in ONE query. Before migration
   * 1780700900000 is applied this degrades to "ungraded, no deductions"
   * instead of 500-ing every harvest read.
   */
  private async withDetails<T extends { id: string }>(
    row: T,
  ): Promise<T & HarvestDetails> {
    return (await this.withDetailsMany([row]))[0];
  }

  private async withDetailsMany<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & HarvestDetails)[]> {
    if (!rows.length) return [];
    let details: any[] = [];
    try {
      details = await this.harvestsRepository.query(
        `SELECT h.id, h.rejected_kg::float AS "rejectedKg", h.rejected_reason AS "rejectedReason",
                h.pieces, h.pieces_estimated AS "piecesEstimated",
                COALESCE(json_agg(json_build_object(
                  'id', g.id, 'countPerKg', g.count_per_kg,
                  'weightKg', g.weight_kg, 'pricePerKg', g.price_per_kg
                ) ORDER BY g.sort_order) FILTER (WHERE g.id IS NOT NULL), '[]') AS grades
           FROM harvests h LEFT JOIN harvest_grades g ON g.harvest_id = h.id
          WHERE h.id = ANY($1::uuid[])
          GROUP BY h.id`,
        [rows.map((r) => r.id)],
      );
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }
    const byId = new Map((details ?? []).map((d) => [d.id, d]));
    return rows.map((r) => {
      const d = byId.get(r.id);
      return {
        ...r,
        grades: (d?.grades ?? []).map((g: any) => ({
          id: g.id,
          countPerKg: g.countPerKg == null ? null : Number(g.countPerKg),
          weightKg: Number(g.weightKg),
          pricePerKg: g.pricePerKg == null ? null : Number(g.pricePerKg),
        })),
        rejectedKg: d?.rejectedKg ?? null,
        rejectedReason: d?.rejectedReason ?? null,
        pieces: d?.pieces ?? null,
        piecesEstimated: !!d?.piecesEstimated,
      };
    });
  }

  /** Does the caller hold VIEW_FINANCIALS on this pond's farm? */
  private async canViewFinancials(
    userId: string,
    pondId: string,
  ): Promise<boolean> {
    try {
      await this.farmAccess.assertCanAccessPond(
        userId,
        pondId,
        'VIEW_FINANCIALS',
      );
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) return false;
      throw err;
    }
  }

  /**
   * `pondId` gives a pond's CONTINUOUS harvest history — every harvest across
   * every crop cycle it has ever run. `cropId` cannot express that: harvests
   * hang off a crop, and a pond gets a new crop each cycle, so a farmer asking
   * "what has this pond produced?" previously had to be asked back "which of
   * your cycles?" — or, in the app, was shown every harvest on every farm.
   */
  async findAll(userId: string, cropId?: string, pondId?: string) {
    // Scope to farms the caller can access — cropId alone is an optional
    // filter, never the ownership boundary (was leaking every farm's harvests,
    // including sale prices, when omitted).
    const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
    if (farmIds.length === 0) return [];

    // A worker restricted to specific ponds must not see the whole farm's
    // harvests just because the row hangs off a crop rather than a pond.
    const pondIds = (
      await Promise.all(
        farmIds.map((farmId) =>
          this.farmAccess.getAccessiblePondIds(userId, farmId),
        ),
      )
    ).flat();
    if (pondIds.length === 0) return [];

    const qb = this.harvestsRepository
      .createQueryBuilder('harvest')
      .innerJoin('harvest.crop', 'crop')
      .innerJoin('crop.pond', 'pond')
      .addSelect('pond.farmId', 'row_farm_id')
      .where('pond.farmId IN (:...farmIds)', { farmIds })
      .andWhere('crop.pondId IN (:...pondIds)', { pondIds })
      .orderBy('harvest.harvestDate', 'DESC');
    if (cropId) qb.andWhere('harvest.cropId = :cropId', { cropId });
    // Filters WITHIN the pond scope established above — never widens it.
    if (pondId) qb.andWhere('crop.pondId = :pondId', { pondId });
    // ponytail: bounded cap to avoid an unbounded payload; paginate if needed.
    const { entities, raw } = await qb.take(500).getRawAndEntities();

    // A sale price is a financial. This list is an operational history (what
    // came out of this pond), so it stays readable by every member — but the
    // money on it is masked per farm unless the caller holds VIEW_FINANCIALS
    // there, matching `findMoneyEntries`. Masking beats dropping the row: the
    // worker still gets their harvest weights.
    const financialFarmIds = new Set(
      await this.farmAccess.getFarmIdsWithCapability(userId, 'VIEW_FINANCIALS'),
    );
    const detailed = await this.withDetailsMany(entities);
    return detailed.map((h, i) =>
      maskFinancials(h, financialFarmIds.has(raw[i]?.row_farm_id)),
    );
  }

  /**
   * Harvest sales as Money-tab line items — READ-ONLY projections, not rows.
   *
   * Reported as "after giving a harvest with some profit, that profit is not
   * shown in the money tab". It WAS in the headline: `getFinancialReport` sums
   * every harvest's `salePriceTotal` into revenue. What was missing is a line
   * the farmer can point at — the entry list under the hero renders the
   * `transactions` table only, and a harvest never writes one.
   *
   * The fix is emphatically NOT to write a Transaction when a harvest is
   * created: `getFinancialReport` sums harvest sale prices AND the transactions
   * table, so that would double-count every harvest in revenue and profit.
   * Merging at read time keeps one source of truth per number.
   *
   * Scoped to VIEW_FINANCIALS farms — a sale price is a financial, and this is
   * narrower than `findAll`'s merely-accessible scoping on purpose. It matches
   * `transactionsService.findAll`, whose output these rows are merged with.
   */
  async findMoneyEntries(
    userId: string,
    q?: {
      startDate?: string;
      endDate?: string;
      includeArchivedPonds?: boolean;
    },
  ): Promise<HarvestMoneyEntry[]> {
    const farmIds = await this.farmAccess.getFarmIdsWithCapability(
      userId,
      'VIEW_FINANCIALS',
    );
    if (farmIds.length === 0) return [];

    const qb = this.harvestsRepository
      .createQueryBuilder('harvest')
      .innerJoin('harvest.crop', 'crop')
      .innerJoin('crop.pond', 'pond')
      .where('pond.farmId IN (:...farmIds)', { farmIds });

    /**
     * The same two filters the report applies to the revenue it puts in the
     * headline, applied HERE rather than by the caller in memory.
     *
     * D3: the Money tab's "count archived ponds" toggle dropped a retired
     * pond's revenue from the total (the report skips the pond entirely) and
     * kept its harvest sale rows in the list underneath — a line item the
     * total above it did not contain.
     *
     * And the date range has to be SQL, not a `.filter()` after the fact: the
     * read is capped at 500 rows, so filtering afterwards made "this week"
     * search only the 500 most recent harvests instead of the week's.
     */
    if (q?.includeArchivedPonds === false) {
      qb.andWhere("pond.status <> 'archived'");
    }
    // `harvests.harvest_date` is a plain DATE column, so `YYYY-MM-DD` bounds
    // compare directly — no IST instant conversion, same as `expenses.date`.
    if (q?.startDate)
      qb.andWhere('harvest.harvestDate >= :startDate', {
        startDate: q.startDate,
      });
    if (q?.endDate)
      qb.andWhere('harvest.harvestDate <= :endDate', { endDate: q.endDate });

    const rows = await qb
      // A harvest logged with no sale price yet is NOT ₹0 of revenue — it is a
      // sale that has not happened. It contributes nothing to the report's
      // revenue either, so listing it would put a line item on screen that the
      // total above it does not contain. Same for a zero.
      .andWhere('harvest.salePriceTotal IS NOT NULL')
      .andWhere('harvest.salePriceTotal > 0')
      // Pending / discarded harvests are not income (B9).
      .andWhere("harvest.status = 'sold'")
      .select('harvest.id', 'id')
      .addSelect('harvest.harvestDate', 'harvestDate')
      .addSelect('harvest.salePriceTotal', 'salePriceTotal')
      .addSelect('harvest.weightKg', 'weightKg')
      .addSelect('harvest.buyerName', 'buyerName')
      .addSelect('pond.id', 'pondId')
      .addSelect('pond.farmId', 'farmId')
      .addSelect('pond.name', 'pondName')
      .addSelect('pond.status', 'pondStatus')
      .addSelect('crop.name', 'cropName')
      .orderBy('harvest.harvestDate', 'DESC')
      // ponytail: same bounded cap as findAll; paginate if a farm ever needs it.
      .take(500)
      .getRawMany<Record<string, any>>();

    return rows.map((r) => ({
      id: `harvest:${r.id}`,
      source: 'harvest' as const,
      farmId: r.farmId,
      transactionDate: asDateString(r.harvestDate),
      type: 'income' as const,
      category: 'Harvest',
      description: [r.pondName, r.cropName].filter(Boolean).join(' · '),
      amount: Number(r.salePriceTotal) || 0,
      buyerName: r.buyerName ?? undefined,
      weightKg: r.weightKg == null ? undefined : Number(r.weightKg),
      pondId: r.pondId ?? null,
      pondName: r.pondName ?? null,
      // Marked, never hidden (D3) — same flag the pond-cost rows carry, so the
      // client colours both from one rule.
      archived: r.pondStatus === 'archived',
    }));
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<Harvest & HarvestDetails> {
    const harvest = await this.harvestsRepository.findOne({
      where: { id },
      relations: ['crop'],
    });
    if (!harvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }
    // The crop was loaded only to find the pond — keep the response shape.
    const { crop, ...row } = harvest;
    return maskFinancials(
      await this.withDetails(row as Harvest),
      await this.canViewFinancials(userId, crop.pondId),
    );
  }

  /**
   * Load a harvest and prove the caller may record harvests on its pond.
   *
   * The route guard says the same thing, but the service is where it is
   * enforced: `update`/`remove` are also reachable from other services, and a
   * guard on the HTTP layer proves nothing about those.
   */
  private async assertCanRecord(id: string, userId: string): Promise<Harvest> {
    const harvest = await this.harvestsRepository.findOne({
      where: { id },
      relations: ['crop'],
    });
    if (!harvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }
    await this.farmAccess.assertCanAccessPond(
      userId,
      harvest.crop.pondId,
      'RECORD_HARVEST',
    );
    return harvest;
  }

  async update(
    id: string,
    dto: UpdateHarvestDto,
    userId: string,
  ): Promise<Harvest & HarvestDetails> {
    const existing = await this.assertCanRecord(id, userId);
    const {
      grades,
      rejectedKg,
      rejectedReason,
      confirmOutOfRange,
      harvestType,
      ...fields
    } = dto;
    // Immutable (H2): a full harvest closed the cycle. Old builds resend the
    // same type on every edit — accepted and ignored.
    if (harvestType && harvestType !== existing.harvestType) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'HARVEST_TYPE_IMMUTABLE',
        message:
          'The harvest type cannot be changed. Delete this harvest and log it again.',
      });
    }
    const canView = await this.canViewFinancials(
      userId,
      existing.crop.pondId,
    );
    if (!canView) {
      delete fields.salePriceTotal;
      delete fields.buyerName;
    }
    if (fields.harvestDate) {
      assertHarvestDate(fields.harvestDate, existing.crop.stockingDate);
    }

    if (!grades && rejectedKg === undefined && rejectedReason === undefined) {
      await this.harvestsRepository.update(id, {
        ...fields,
        updatedById: userId,
      });
      return this.findOne(id, userId);
    }

    // Replace-all grades + derived aggregate + deductions, atomically.
    await this.dataSource.transaction(async (manager) => {
      let lines: GradeLine[] | null = null;
      let totals: HarvestTotals | null = null;
      if (grades) {
        lines = canView
          ? this.cleanGrades(grades, true)
          : await this.carryOverPrices(manager, id, grades);
        // Only the caller's OWN prices are theirs to confirm.
        if (canView) assertPriceBand(lines, confirmOutOfRange);
        totals = harvestTotals(
          lines,
          await this.abwAt(
            manager,
            existing.cropId,
            fields.harvestDate ?? asDateString(existing.harvestDate),
          ),
        );
        Object.assign(fields, {
          weightKg: totals.weightKg,
          salePriceTotal: totals.salePriceTotal,
          averageSize: totals.averageSize,
        });
      }
      await manager.update(Harvest, id, { ...fields, updatedById: userId });
      await this.writeDetails(manager, id, lines, totals, rejectedKg, rejectedReason);
    });
    return this.findOne(id, userId);
  }

  /**
   * A member without VIEW_FINANCIALS edits weights, never prices: the owner's
   * price rides over to the same line (by id, else by position) so a
   * replace-all edit can't silently wipe the season's money.
   */
  private async carryOverPrices(
    manager: EntityManager,
    harvestId: string,
    grades: GradeDto[],
  ): Promise<GradeLine[]> {
    const old: { id: string; price: number | null }[] = await manager.query(
      `SELECT id, price_per_kg::float AS price FROM harvest_grades
        WHERE harvest_id = $1 ORDER BY sort_order`,
      [harvestId],
    );
    return this.cleanGrades(grades, false).map((g, i) => ({
      ...g,
      pricePerKg:
        (g.id ? old.find((o) => o.id === g.id)?.price : old[i]?.price) ??
        null,
    }));
  }

  /**
   * Deleting a FULL harvest undoes its close (H2): in one transaction the crop
   * reopens and the pond points back at it — unless the pond has since
   * started another cycle, which would leave two active cycles on one pond
   * (409 POND_HAS_NEW_CYCLE).
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const harvest = await this.assertCanRecord(id, userId);
    if (harvest.harvestType !== 'full') {
      await this.harvestsRepository.delete(id);
      return { message: 'Harvest deleted successfully' };
    }

    await this.dataSource.transaction(async (manager) => {
      const crop = await manager.findOne(Crop, {
        where: { id: harvest.cropId },
        lock: { mode: 'pessimistic_write' },
      });
      if (crop && crop.status === 'completed') {
        const pond = await manager.findOne(Pond, {
          where: { id: crop.pondId },
          lock: { mode: 'pessimistic_write' },
        });
        const newer =
          (pond?.activeCycleId && pond.activeCycleId !== crop.id) ||
          (await manager.count(Crop, {
            where: { pondId: crop.pondId, status: 'active', id: Not(crop.id) },
          })) > 0;
        if (newer) {
          throw new ConflictException({
            statusCode: 409,
            code: 'POND_HAS_NEW_CYCLE',
            message:
              "A new cycle has started on this pond; this harvest can't be removed.",
          });
        }
        await manager.update(Crop, crop.id, {
          status: 'active',
          actualHarvestDate: null,
          isActive: true,
        } as any);
        await manager.update(Pond, crop.pondId, {
          activeCycleId: crop.id,
          status: 'active',
        } as any);
      }
      await manager.delete(Harvest, id);
    });
    return { message: 'Harvest deleted successfully' };
  }
}
