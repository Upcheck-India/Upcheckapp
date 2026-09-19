import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';
import { FeedRecordsService } from '../feed-records/feed-records.service';
import { HarvestsService } from '../harvests/harvests.service';
import { ExpensesService } from '../finances/expenses.service';
import { SamplingService } from '../sampling/sampling.service';
import { CropsService } from '../crops/crops.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { istDayRangeUtc, toIstDateString } from '../common/ist-date';
import { TransactionsService } from '../transactions/transactions.service';
import { computeDoc } from '../crops/crop.entity';
import { FREE_NH3, isCritical } from '../common/wq-thresholds';
import { ShrimpCalculationsService } from '../shrimp-calculations/shrimp-calculations.service';
import { isMissingSchema } from '../pond-context/pond-context.service';
import { BIOSECURITY_ITEMS } from '../crops/biosecurity.service';
import {
  DEFAULT_PL_ABW_G,
  ResultHarvest,
  fcrBand,
  gradeStats,
  inMoltWindow,
  inPeak,
  moltWindowsBetween,
  nextCycleLines,
  srBand,
  survivalFrom,
  worstMortalitySpike,
} from './cycle-result';
import {
  FinancialReportQueryDto,
  dateRangeWhere,
} from '../transactions/dto/money-query.dto';

// Farms are hard-capped at 500 ponds (PondNamingService.MAX_PONDS_PER_FARM).
// A page size well above that is effectively "no limit" for pondsService.findAll,
// which otherwise defaults to take=50 and silently truncates large farms.
const ALL_PONDS_PAGE = { skip: 0, take: 10000 } as PageOptionsDto;

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly pondsService: PondsService,
    private readonly inventoryService: InventoryService,
    private readonly feedRecordsService: FeedRecordsService,
    private readonly harvestsService: HarvestsService,
    private readonly expensesService: ExpensesService,
    private readonly samplingService: SamplingService,
    private readonly cropsService: CropsService,
    private readonly farmAccess: FarmAccessService,
    private readonly transactionsService: TransactionsService,
    private readonly dataSource: DataSource,
  ) {}

  // Stateless maths; no DI needed for one pure method.
  private readonly calc = new ShrimpCalculationsService();

  async getDashboardSummary(userId: string, farmId?: string) {
    if (!farmId) {
      return {
        activePondsCount: 0,
        totalPondsCount: 0,
        lowStockAlerts: 0,
        todayFeedUsage: 0,
      };
    }

    // Prevent cross-tenant reads (and poisoned per-user cache keys): the caller
    // must own or belong to farmId before we query or cache anything for it.
    await this.farmAccess.assertCanAccessFarm(userId, farmId, 'READ');

    // Deliberately NOT cached. This used to sit behind a 300s TTL with no
    // invalidation anywhere, so logging feed left `todayFeedUsage` showing the
    // old number for up to five minutes — a plausible-but-wrong figure, which
    // is worse than a slightly slower one. The four counts below are already
    // parallel and indexed; a shorter TTL would not fix the class of bug.
    const [activePondsCount, totalPondsCount, lowStockAlerts, todayFeedUsage] =
      await Promise.all([
        this.pondsService.countActivePonds(farmId),
        this.pondsService.countTotalPonds(farmId),
        this.inventoryService.countLowStock(farmId),
        this.feedRecordsService.getDailyFeedUsage(farmId, new Date()),
      ]);

    return {
      activePondsCount,
      totalPondsCount,
      lowStockAlerts,
      todayFeedUsage,
    };
  }

  async getCycleAnalysis(cycleId: string, userId: string) {
    // Deliberately the VIEW_FINANCIALS-strict `cropsService.findOne` (owner +
    // manager), NOT `findOneAccessible`. Cycle analysis is a financial report,
    // so it must inherit the same capability the economics path uses. Do not
    // "fix" this to the member-aware variant — that would hand a worker or
    // viewer the farm's cycle economics.
    await this.cropsService.findOne(cycleId, userId);
    // Same numbers as the Cycle Result (H3), never a second FCR/SR formula:
    // crop-scoped feed, and survival from harvested pieces — not the latest
    // sampling SR estimate, which is a guess the farmer typed mid-cycle.
    const r = await this.getCycleResult(cycleId, userId);
    return {
      cycleId,
      fcr: r.fcr,
      totalFeedKg: r.feedKg,
      totalHarvestKg: r.harvestedKg,
      survivalRate: r.survival?.pct ?? null,
      growthChart: r.growthChart,
    };
  }

  /**
   * The Cycle Result (harvest-and-molt H3): READ for everyone on the pond;
   * money only for VIEW_FINANCIALS, taken from `getCycleFinancials` so there
   * is ONE profit number per cycle everywhere (C5).
   */
  async getCycleResult(cropId: string, userId: string) {
    const crop = await this.cropsService.findOneAccessible(cropId, userId);
    const pond = await this.pondsService.findOneAccessible(
      crop.pondId,
      userId,
      'READ',
    );

    // Both `(userId, cropId?)` — the crop is the SECOND arg (a cycle id in
    // the userId slot scopes the read to no farms at all).
    const [allHarvests, samplings, financials] = await Promise.all([
      this.harvestsService.findAll(userId, cropId),
      this.samplingService.findAll(userId, cropId),
      this.expensesService
        .getCycleFinancials(cropId, userId)
        .catch((err) => {
          if (err instanceof ForbiddenException) return null;
          throw err;
        }),
    ]);
    // Only a SOLD harvest is harvested biomass (same filter as P&L).
    const harvests = (allHarvests as any[]).filter((h) => h.status === 'sold');

    // A DATE column arrives as 'YYYY-MM-DD'; an instant is bucketed in IST.
    const day = (d: unknown) =>
      typeof d === 'string' && d.length === 10 ? d : toIstDateString(new Date(d as any));
    const today = toIstDateString(new Date());
    const startDay = day(crop.stockingDate ?? crop.createdAt);
    const lastFull = harvests.find((h) => h.harvestType === 'full');
    const endDay = crop.actualHarvestDate
      ? day(crop.actualHarvestDate)
      : lastFull
        ? day(lastFull.harvestDate)
        : today;
    const doc = crop.stockingDate
      ? computeDoc(crop.stockingDate, 0, new Date(`${endDay}T12:00:00+05:30`))
      : null;

    const q = (sql: string, params: unknown[]) => this.dataSource.query(sql, params);
    // A column/table from a not-yet-applied migration reads as "not logged".
    const tolerant = <T>(p: Promise<T>, fallback: T) =>
      p.catch((err) => {
        if (isMissingSchema(err)) return fallback;
        throw err;
      });
    const windowStart = istDayRangeUtc(startDay).start;
    const windowEnd = istDayRangeUtc(endDay).end;

    const [feedRow, closeRow, wq, chem, mortality, diseases, bio, seed] =
      await Promise.all([
        // C2: crop-scoped feed, plus the pond's UNTAGGED rows inside the
        // cycle's window (older builds logged feed without crop_id).
        q(
          `SELECT COALESCE(SUM(quantity_kg) FILTER (WHERE crop_id = $1), 0)::float AS tagged,
                  COALESCE(SUM(quantity_kg) FILTER (WHERE crop_id IS NULL), 0)::float AS untagged,
                  COUNT(*) FILTER (WHERE crop_id IS NULL)::int AS "untaggedN"
             FROM feed_records
            WHERE crop_id = $1
               OR (crop_id IS NULL AND pond_id = $2 AND recorded_at BETWEEN $3 AND $4)`,
          [cropId, crop.pondId, windowStart, windowEnd],
        ).then((r: any[]) => r[0]),
        tolerant(
          q(`SELECT close_reason AS "closeReason" FROM crops WHERE id = $1`, [cropId]),
          [] as any[],
        ),
        q(
          `SELECT to_char((recorded_at AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
                  dissolved_oxygen::float AS "do", ph::float AS ph,
                  temperature::float AS temp, salinity::float AS sal, ammonia::float AS ammonia
             FROM water_quality_records
            WHERE pond_id = $1 AND recorded_at BETWEEN $2 AND $3
            ORDER BY recorded_at`,
          [crop.pondId, windowStart, windowEnd],
        ),
        q(
          `SELECT measurement_date::text AS day, ammonia_nh3_ppm::float AS ammonia
             FROM chemical_data
            WHERE crop_id = $1 AND ammonia_nh3_ppm IS NOT NULL`,
          [cropId],
        ),
        q(
          `SELECT record_date::text AS day, quantity AS count
             FROM mortality_records WHERE crop_id = $1`,
          [cropId],
        ),
        // D6 outcome columns; before that migration the episodes still show.
        tolerant(
          q(
            `SELECT r.recorded_date::text AS "recordedDate", l.name, r.outcome
               FROM disease_records r LEFT JOIN disease_library l ON l.id = r.disease_id
              WHERE r.crop_id = $1 ORDER BY r.recorded_date`,
            [cropId],
          ),
          null,
        ).then(
          (rows) =>
            rows ??
            tolerant(
              q(
                `SELECT r.recorded_date::text AS "recordedDate", l.name, NULL AS outcome
                   FROM disease_records r LEFT JOIN disease_library l ON l.id = r.disease_id
                  WHERE r.crop_id = $1 ORDER BY r.recorded_date`,
                [cropId],
              ),
              null,
            ),
        ),
        // D5 is built in parallel: read its table/columns tolerantly and
        // NEVER depend on its code. Missing → "not logged".
        tolerant(
          q(
            `SELECT COUNT(DISTINCT item_key)::int AS done FROM biosecurity_checks
              WHERE crop_id = $1 AND done_on IS NOT NULL`,
            [cropId],
          ),
          null,
        ),
        tolerant(
          q(
            `SELECT pl_pcr_results AS results, pl_pcr_date::text AS date, pl_spf AS spf
               FROM crops WHERE id = $1`,
            [cropId],
          ),
          null,
        ),
      ]);

    // ---- Harvest metrics ------------------------------------------------
    const resultHarvests: ResultHarvest[] = harvests.map((h) => ({
      harvestDate: h.harvestDate,
      weightKg: Number(h.weightKg) || 0,
      averageSize: h.averageSize == null ? null : Number(h.averageSize),
      pieces: h.pieces ?? null,
      piecesEstimated: !!h.piecesEstimated,
      rejectedKg: h.rejectedKg ?? null,
      rejectedReason: h.rejectedReason ?? null,
      grades: h.grades ?? [],
    }));
    const harvestedKg = r2(resultHarvests.reduce((s, h) => s + h.weightKg, 0));
    const weighed = (samplings as any[])
      .filter((s) => s.mbwG != null)
      .sort((a, b) => new Date(a.samplingDate).getTime() - new Date(b.samplingDate).getTime());
    const latestAbwG = weighed.length ? Number(weighed[weighed.length - 1].mbwG) : null;
    const stocked = crop.stockingCount ?? crop.totalSeed ?? null;
    const survival = survivalFrom(resultHarvests, stocked, latestAbwG);
    const { avgCount, gradeMix } = gradeStats(resultHarvests);

    const feedKg = r2(Number(feedRow?.tagged ?? 0) + Number(feedRow?.untagged ?? 0));
    const untaggedFeedLogs = Number(feedRow?.untaggedN ?? 0);
    const fcr = harvestedKg > 0 && feedKg > 0 ? r2(feedKg / harvestedKg) : null;

    const area = Number(pond.overrideAreaM2 ?? pond.calculatedAreaM2) || 0;
    const yieldTPerHa =
      area > 0 && harvestedKg > 0
        ? { tPerHa: r2((harvestedKg * 10) / area), areaAssumed: (pond.assumedFields ?? []).includes('areaM2') }
        : null; // Hidden when the area is unknown — never assumed.

    const finalAbwG = avgCount ? 1000 / avgCount : latestAbwG;
    const adgGPerDay =
      finalAbwG && doc && doc > 0 ? r2((finalAbwG - DEFAULT_PL_ABW_G) / doc) : null;

    // ---- Welfare (disease spec §3): facts from logs, null = not logged ----
    const windows = moltWindowsBetween(startDay, endDay);
    const byDay = new Map<string, { ph?: number; temp?: number; sal?: number }>();
    const doMin = new Map<string, number>();
    for (const r of wq as any[]) {
      const d = byDay.get(r.day) ?? {};
      if (r.ph != null) d.ph = r.ph;
      if (r.temp != null) d.temp = r.temp;
      if (r.sal != null) d.sal = r.sal;
      byDay.set(r.day, d);
      if (r.do != null) doMin.set(r.day, Math.min(doMin.get(r.day) ?? Infinity, r.do));
    }
    const nh3Days = new Map<string, boolean>();
    const addNh3 = (dayKey: string, tan: number, ph?: number, temp?: number, sal?: number) => {
      if (ph == null || temp == null) return;
      const v = this.calc.calculateFreeAmmonia(tan, ph, temp, sal ?? 0).unionizedAmmonia;
      nh3Days.set(dayKey, (nh3Days.get(dayKey) ?? false) || isCritical(v, FREE_NH3));
    };
    for (const r of wq as any[]) {
      if (r.ammonia == null) continue;
      const d = byDay.get(r.day) ?? {};
      addNh3(r.day, r.ammonia, r.ph ?? d.ph, r.temp ?? d.temp, r.sal ?? d.sal);
    }
    for (const r of chem as any[]) {
      if (r.day < startDay || r.day > endDay) continue;
      const d = byDay.get(r.day) ?? {};
      addNh3(r.day, r.ammonia, d.ph, d.temp, d.sal);
    }
    const handlingDays = new Set<string>([
      ...(samplings as any[]).map((s) => day(s.samplingDate)),
      ...resultHarvests.map((h) => day(h.harvestDate)),
    ]);

    const softShellRejectedKgInMolt = resultHarvests
      .filter(
        (h) =>
          h.rejectedReason === 'soft_shell' &&
          (h.rejectedKg ?? 0) > 0 &&
          inMoltWindow(windows, day(h.harvestDate)),
      )
      .reduce((s, h) => s + Number(h.rejectedKg), 0);

    const closeReason = (closeRow as any[])[0]?.closeReason ?? null;
    const seedRow = (seed as any[] | null)?.[0];
    const bioDone = (bio as any[] | null)?.[0]?.done ?? 0;

    return {
      cropId,
      pondId: crop.pondId,
      farmId: crop.farmId,
      pondName: pond.displayName ?? pond.name,
      status: crop.status,
      closeReason,
      lost: closeReason === 'lost',
      stockingDate: crop.stockingDate ? startDay : null,
      endDate: endDay,
      doc,
      stockedCount: stocked,
      harvestedKg,
      yield: yieldTPerHa,
      survival,
      srBand: srBand(survival?.pct ?? null),
      feedKg,
      untaggedFeedLogs,
      fcr,
      fcrBand: fcrBand(fcr),
      avgCount,
      gradeMix,
      adgGPerDay,
      stockingAbwAssumedG: DEFAULT_PL_ABW_G,
      money: financials
        ? {
            revenue: financials.totalRevenue,
            cost: financials.totalExpenses,
            profit: financials.netProfit,
            marginPct: financials.marginPercent,
            breakEvenPricePerKg: financials.breakEvenPricePerKg,
          }
        : null,
      nextCycle: nextCycleLines({
        fcr,
        feedKg,
        harvestedKg,
        survival,
        spikeDay: worstMortalitySpike(mortality as any[]),
        softShellRejectedKgInMolt,
      }),
      welfare: {
        doBelow3Days: doMin.size
          ? { days: [...doMin.values()].filter((v) => v < 3).length, of: doMin.size }
          : null,
        nh3CriticalDays: nh3Days.size
          ? { days: [...nh3Days.values()].filter(Boolean).length, of: nh3Days.size }
          : null,
        handlingInMoltPeak: handlingDays.size
          ? [...handlingDays].filter((d) => inPeak(windows, d)).length
          : null,
        diseases: diseases as { recordedDate: string; name: string | null; outcome: string | null }[] | null,
        biosecurity:
          bioDone > 0 ? { done: bioDone, total: BIOSECURITY_ITEMS.length } : null,
        seedPcr: seedRow?.results
          ? { results: seedRow.results, date: seedRow.date ?? null, spf: seedRow.spf ?? null }
          : null,
      },
      growthChart: weighed.map((s) => ({
        // IST-local day, not UTC (DATE-1).
        date: toIstDateString(new Date(s.samplingDate)),
        mbw: Number(s.mbwG),
      })),
    };
  }

  async getFinancialReport(
    farmId: string,
    userId: string,
    q: Partial<FinancialReportQueryDto> = {},
  ) {
    // Financial report is owner/manager only (VIEW_FINANCIALS).
    await this.farmAccess.assertCanAccessFarm(
      userId,
      farmId,
      'VIEW_FINANCIALS',
    );
    // 400 on an inverted range before any of the fan-out below runs.
    dateRangeWhere(q);

    // D3: archived ponds are INCLUDED by default. `pondsService.findAll`
    // excludes `status = 'archived'` when neither `status` nor
    // `includeArchived` is given, so passing nothing here made archiving a
    // pond erase its whole cost/revenue history from the Money tab. The client
    // colours the archived rows differently rather than losing the money.
    const includeArchived = q.includeArchivedPonds !== false;
    // Find all ponds in the farm — an explicit large page, not the default
    // take=50, or a large farm's report silently drops ponds past #50.
    const pondsPage = await this.pondsService.findAll(
      farmId,
      userId,
      { includeArchived },
      ALL_PONDS_PAGE,
    );

    /**
     * `pondsService.findAll` is NOT member-aware — it returns every pond on the
     * farm. VIEW_FINANCIALS is an overridable capability, so an owner can grant
     * it to a pond-scoped viewer or worker, and for that caller this report
     * answered at two scopes at once: costs (summed per pond below) covered the
     * whole farm, while revenue did not — `getCycleFinancials` re-asserts
     * VIEW_FINANCIALS per pond and 403s on the ones outside the scope — and
     * neither did the Money tab's entry list, which goes through
     * `ExpensesService.findMoneyEntries`. Headline and list must agree.
     *
     * `getAccessiblePondIds` returns EVERY live pond for an unscoped caller,
     * which owner and manager always are, so this narrows nothing for them.
     */
    const inScope = new Set(
      await this.farmAccess.getAccessiblePondIds(
        userId,
        farmId,
        'VIEW_FINANCIALS',
      ),
    );
    const scopedPonds = pondsPage.data.filter((p: any) => inScope.has(p.id));

    let totalRevenue = 0;
    let totalExpenses = 0;
    const expensesByCategory: Record<string, number> = {};

    // Aggregate across ALL cycles of every pond — not just the active one —
    // so completed/past cycles still contribute to the farm's finances.
    // Per-pond and per-crop fan-out is parallelized (was a sequential N+1);
    // Promise.all preserves array order, so the summation order below —
    // and therefore the arithmetic result — is unchanged.
    //
    // Resilience is load-bearing, not defensive padding. Every one of these
    // calls used to reject straight out of `Promise.all`, and the Money tab's
    // batching layer catches a failed report by DROPPING THE FARM — so one bad
    // pond or one bad cycle made a whole farm silently vanish from the tab.
    // Degrade the crop, never the farm, and never silently.
    //
    // `findAllAccessible`, not `findByPond`: the latter goes through
    // `verifyOwner`, which is OWNER-ONLY, so a manager holding VIEW_FINANCIALS
    // 403'd here and lost the farm. This is not a loosening — the farm-level
    // VIEW_FINANCIALS assert above already gated this whole method, and
    // `getCycleFinancials` re-asserts VIEW_FINANCIALS per crop below. Only the
    // listing of which cycles exist moved to the member-aware read.
    const perPondCropFinancials = await Promise.all(
      scopedPonds.map(async (pond) => {
        const crops = await this.cropsService
          .findAllAccessible(pond.id, userId)
          .catch((err) => {
            this.logger.warn(
              `Financial report ${farmId}: skipping pond ${pond.id} — ${err?.message ?? err}`,
            );
            return [] as { id: string }[];
          });
        return Promise.all(
          crops.map((crop) =>
            this.expensesService
              .getCycleFinancials(crop.id, userId, q)
              .catch((err) => {
                this.logger.warn(
                  `Financial report ${farmId}: skipping cycle ${crop.id} — ${err?.message ?? err}`,
                );
                return null;
              }),
          ),
        );
      }),
    );

    // Per-pond rows, in the same order as `scopedPonds`, each tagged with
    // whether the pond is archived so the client can colour it differently
    // (D3) — and so a farmer can see WHICH money came from a retired pond.
    const ponds: {
      pondId: string;
      name: string | null;
      archived: boolean;
      revenue: number;
      expenses: number;
    }[] = [];

    /**
     * Costs come from the POND, not from the crop loop above.
     *
     * `getCycleFinancials` filters `WHERE cropId = ...`, and `create` leaves
     * `cropId` null whenever the pond has no running cycle (it falls back to
     * `pond.activeCycleId`). Those rows matched no crop and were counted
     * NOWHERE — a farmer between crops could record costs all season and still
     * read ₹0. Summing per pond counts every expense exactly once, cropped or
     * not, and collapses the per-crop fan-out into one query.
     *
     * Revenue still comes from the crop loop: it is harvest-derived and a
     * harvest genuinely belongs to a cycle.
     */
    const expensesByPond = await this.expensesService.totalsByPond(
      scopedPonds.map((p: any) => p.id),
      q,
    );

    perPondCropFinancials.forEach((cropFinancials, i) => {
      const pond: any = scopedPonds[i];
      let pondRevenue = 0;
      for (const financials of cropFinancials) {
        if (!financials) continue; // skipped above, already logged
        pondRevenue += financials.totalRevenue;
      }
      const pondCosts = expensesByPond.get(pond?.id);
      const pondExpenses = pondCosts?.total ?? 0;
      for (const [category, amount] of Object.entries(
        pondCosts?.byCategory ?? {},
      )) {
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) + Number(amount);
      }
      totalRevenue += pondRevenue;
      totalExpenses += pondExpenses;
      ponds.push({
        pondId: pond?.id,
        name: pond?.displayName ?? pond?.name ?? null,
        archived: pond?.status === 'archived',
        revenue: pondRevenue,
        expenses: pondExpenses,
      });
    });

    // Farm-level transactions, on top of the per-cycle ledger above.
    //
    // These were missing entirely, and the Money tab's own "Add entry" button
    // is what writes them: a farmer recorded ₹50,000 of feed, came back, and
    // the headline still read ₹0 while the entries they had just typed were
    // listed directly underneath it. The two ledgers are separate tables
    // written by different screens — nothing writes both from one action — so
    // adding them is a sum, not a double count.
    const transactions = await this.transactionsService
      .findAll(userId, {
        farmId,
        startDate: q.startDate,
        endDate: q.endDate,
        includeInventoryPurchases: q.includeInventoryPurchases,
      })
      .catch(() => []);
    // The slice of `totalExpenses` that came from inventory purchases (D2), so
    // the client can show "of which inventory: ₹X" without a second request.
    // Necessarily 0 when `includeInventoryPurchases=false` — those rows are
    // then not in `totalExpenses` either.
    let inventoryExpenses = 0;
    const pondRowById = new Map(ponds.map((row) => [row.pondId, row]));
    const reportPondIds = new Set(scopedPonds.map((p: any) => p.id));
    for (const tx of transactions) {
      /**
       * A transaction may name a pond. When it names one this report is not
       * counting — archived while "count archived ponds" is off, or outside a
       * scoped member's ponds — it must not ride into the totals anyway: the
       * archive toggle claimed to drop that pond's money and dropped only the
       * `expenses` half of it. A row with NO pond is a farm-level cost (a
       * licence, a shared generator) and always counts.
       */
      if (tx.pondId && !reportPondIds.has(tx.pondId)) continue;
      const amount = Number(tx.amount) || 0;
      // A transaction the farmer attributed to a pond belongs in that pond's
      // row too, not only in the farm total — `ponds[]` is the ONLY thing that
      // can answer "how much of this came from a retired pond", and the Money
      // tab's archive hint reads it. Leaving pond-attributed transactions out
      // made the rows stop adding up to the total above them.
      const pondRow = tx.pondId ? pondRowById.get(tx.pondId) : undefined;
      if (tx.type === 'income') {
        totalRevenue += amount;
        if (pondRow) pondRow.revenue += amount;
      } else {
        totalExpenses += amount;
        if (pondRow) pondRow.expenses += amount;
        if (tx.inventoryItemId) inventoryExpenses += amount;
        const category = tx.category || 'Other';
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) + amount;
      }
    }

    const expensesByCategoryArray = Object.entries(expensesByCategory).map(
      ([category, amount]) => ({
        category,
        amount,
      }),
    );

    return {
      revenue: totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      expensesByCategory: expensesByCategoryArray,
      inventoryExpenses,
      ponds,
      includedArchivedPonds: includeArchived,
    };
  }
}
