import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PriceFeed } from './price-feed.entity';
import { CountPriceBand } from './economics.service';
import { toIstDateString } from '../common/ist-date';
import { isMissingSchema } from '../pond-context/pond-context.service';

/** ₹/kg at a count, and whether it came from outside the quoted range. */
export interface CountPrice {
  price: number;
  extrapolated: boolean;
}

/**
 * ₹/kg for a count, linearly interpolated between the neighbouring bands (H5.2).
 * Outside the quoted range it clamps to the end band and says so
 * (`extrapolated`), so the UI can say "no quote for 25-count; using 30-count".
 * Null with no bands.
 */
export function interpolatePrice(
  bands: CountPriceBand[],
  count: number,
): CountPrice | null {
  if (!bands?.length) return null;
  const sorted = [...bands].sort((a, b) => a.count - b.count);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (count < first.count) return { price: first.price, extrapolated: true };
  if (count > last.count) return { price: last.price, extrapolated: true };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (count >= a.count && count <= b.count) {
      const frac = (count - a.count) / (b.count - a.count || 1);
      return { price: a.price + frac * (b.price - a.price), extrapolated: false };
    }
  }
  return { price: last.price, extrapolated: false }; // single band, exact count
}

export const QUOTE_STALE_DAYS = 7;
export const QUOTE_MISSING_DAYS = 30;
/** The counts the sheet starts with when the farm has no quote history. */
export const DEFAULT_QUOTE_COUNTS = [30, 40, 50, 60, 70, 80, 100];

export interface FarmPriceQuote {
  id: string;
  farmId: string;
  quotedOn: string;
  buyer: string | null;
  bands: CountPriceBand[];
  source: 'quote' | 'harvest';
  harvestId: string | null;
  createdAt: string;
}

export interface CurrentQuote {
  /** Newest by quoted_on; returned even when too old to advise from. */
  quote: FarmPriceQuote | null;
  ageDays: number | null;
  /** fresh ≤7d · stale >7d (amber) · missing: none, or >30d (H6 won't use it). */
  status: 'fresh' | 'stale' | 'missing';
  /** Counts the sheet's rows start from (the last 3 quotes' counts). */
  defaultCounts: number[];
}

/** Age in whole IST days and the resulting status. */
export function quoteStatus(
  quotedOn: string | null,
  now: Date,
): { ageDays: number | null; status: CurrentQuote['status'] } {
  if (!quotedOn) return { ageDays: null, status: 'missing' };
  const ageDays = Math.round(
    (Date.parse(`${toIstDateString(now)}T00:00:00Z`) -
      Date.parse(`${quotedOn.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );
  const status =
    ageDays > QUOTE_MISSING_DAYS
      ? 'missing'
      : ageDays > QUOTE_STALE_DAYS
        ? 'stale'
        : 'fresh';
  return { ageDays, status };
}

/** Priced graded lines → quote bands (one per count, first line wins). */
export function bandsFromGrades(
  lines: { countPerKg: number | null; pricePerKg: number | null }[],
): CountPriceBand[] {
  const byCount = new Map<number, number>();
  for (const l of lines) {
    if (l.countPerKg == null || l.pricePerKg == null) continue;
    const count = Number(l.countPerKg);
    const price = Number(l.pricePerKg);
    if (!(count > 0) || !(price > 0) || byCount.has(count)) continue;
    byCount.set(count, price);
  }
  return [...byCount]
    .map(([count, price]) => ({ count, price }))
    .sort((a, b) => a.count - b.count)
    .slice(0, 12);
}

/**
 * A sale IS a quote: write a 'harvest' quote from a harvest's priced grade
 * lines, inside the harvest's transaction (H5.1). A SAVEPOINT keeps an
 * unapplied migration from aborting the harvest itself — the sale must save
 * even when the price book can't.
 */
export async function writeHarvestQuote(
  manager: EntityManager,
  args: {
    pondId: string;
    harvestId: string;
    harvestDate: string;
    buyer?: string | null;
    bands: CountPriceBand[];
    userId: string;
  },
): Promise<void> {
  if (!args.bands.length) return;
  await manager.query('SAVEPOINT farm_price_quote');
  try {
    await manager.query(
      `INSERT INTO farm_price_quotes (farm_id, quoted_on, buyer, bands, source, harvest_id, created_by)
       SELECT p.farm_id, $2, $3, $4::jsonb, 'harvest', $5, $6 FROM ponds p WHERE p.id = $1`,
      [
        args.pondId,
        args.harvestDate.slice(0, 10),
        args.buyer?.trim() || null,
        JSON.stringify(args.bands),
        args.harvestId,
        args.userId,
      ],
    );
    await manager.query('RELEASE SAVEPOINT farm_price_quote');
  } catch (err) {
    await manager.query('ROLLBACK TO SAVEPOINT farm_price_quote');
    if (!isMissingSchema(err)) throw err;
  }
}

const QUOTE_COLUMNS =`id, farm_id AS "farmId", quoted_on::text AS "quotedOn", buyer,
  bands, source, harvest_id AS "harvestId", created_at AS "createdAt"`;

/**
 * Count-band price resolution (india §7) and the farm price book (H5).
 * Regional {@link PriceFeed}s are admin-written; the farm's own buyer quotes
 * live in `farm_price_quotes` (raw SQL — see migration 1780701100000).
 */
@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceFeed)
    private readonly repo: Repository<PriceFeed>,
  ) {}

  /** Parse a `{ "30": 520, ... }` price map into sorted count→price bands. */
  bandsFromPrices(prices: Record<string, number>): CountPriceBand[] {
    return Object.entries(prices ?? {})
      .map(([count, price]) => ({ count: Number(count), price: Number(price) }))
      .filter((b) => Number.isFinite(b.count) && Number.isFinite(b.price))
      .sort((a, b) => a.count - b.count);
  }

  /** ₹/kg at `count`, interpolated between neighbouring bands (H5.2). */
  priceForCount(bands: CountPriceBand[], count: number): CountPrice | null {
    return interpolatePrice(bands, count);
  }

  /** Latest price feed for a region (most recent date first). */
  async latestForRegion(region: string): Promise<PriceFeed | null> {
    return this.repo.findOne({
      where: { region },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  /** ₹/kg for a count from a region's latest feed. Null when none exists. */
  async priceForRegion(region: string, count: number): Promise<number | null> {
    const feed = await this.latestForRegion(region);
    if (!feed) return null;
    return (
      interpolatePrice(this.bandsFromPrices(feed.prices), count)?.price ?? null
    );
  }

  // ── Farm price book (H5). Callers enforce VIEW_FINANCIALS. ─────────────

  /** The farm's newest quotes; [] until migration 1780701100000 is applied. */
  async recentQuotes(farmId: string, take = 3): Promise<FarmPriceQuote[]> {
    try {
      return await this.repo.query(
        `SELECT ${QUOTE_COLUMNS} FROM farm_price_quotes
          WHERE farm_id = $1
          ORDER BY quoted_on DESC, created_at DESC LIMIT $2`,
        [farmId, take],
      );
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
      return [];
    }
  }

  /** Current quote, its age/status and the counts the sheet should offer. */
  async currentQuote(farmId: string, now = new Date()): Promise<CurrentQuote> {
    const recent = await this.recentQuotes(farmId, 3);
    const quote = recent[0] ?? null;
    const counts = [
      ...new Set(
        recent.flatMap((q) => (q.bands ?? []).map((b) => Number(b.count))),
      ),
    ].sort((a, b) => a - b);
    return {
      quote,
      ...quoteStatus(quote?.quotedOn ?? null, now),
      defaultCounts: counts.length ? counts : DEFAULT_QUOTE_COUNTS,
    };
  }

  /** The farm's bands if its current quote is usable (≤30 days), else undefined. */
  async usableBands(farmId: string): Promise<CountPriceBand[] | undefined> {
    const cur = await this.currentQuote(farmId);
    return cur.quote && cur.status !== 'missing' ? cur.quote.bands : undefined;
  }

  /** A typed quote from the sheet. */
  async createQuote(
    farmId: string,
    dto: { quotedOn?: string; buyer?: string | null; bands: CountPriceBand[] },
    userId: string,
  ): Promise<FarmPriceQuote> {
    const bands = dto.bands
      .map((b) => ({ count: Number(b.count), price: Number(b.price) }))
      .sort((a, b) => a.count - b.count);
    const [row] = await this.repo.query(
      `INSERT INTO farm_price_quotes (farm_id, quoted_on, buyer, bands, source, created_by)
       VALUES ($1, $2, $3, $4::jsonb, 'quote', $5)
       RETURNING ${QUOTE_COLUMNS}`,
      [
        farmId,
        dto.quotedOn ?? toIstDateString(new Date()),
        dto.buyer?.trim() || null,
        JSON.stringify(bands),
        userId,
      ],
    );
    return row;
  }

  // ── CRUD (admin-written; see IndiaController.createFeed) ───────────────
  create(data: Partial<PriceFeed>): Promise<PriceFeed> {
    const entity = this.repo.create({ ...data, enteredBy: null });
    return this.repo.save(entity);
  }

  /** Public read — never returns `enteredBy` (a user id). */
  findByRegion(region: string): Promise<PriceFeed[]> {
    return this.repo.find({
      where: { region },
      select: {
        id: true,
        region: true,
        date: true,
        prices: true,
        source: true,
        createdAt: true,
      },
      order: { date: 'DESC' },
      take: 60,
    });
  }
}
