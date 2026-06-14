import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceFeed } from './price-feed.entity';
import { CountPriceBand } from './economics.service';

/**
 * Count-band price resolution (india §7). Harvest & simulation revenue look up
 * ₹/kg by the **achieved count** against the latest regional {@link PriceFeed}.
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

  /** The price of the count band nearest to `count` (ties → lower count). */
  nearestBand(count: number, bands: CountPriceBand[]): CountPriceBand | null {
    if (!bands.length) return null;
    return bands.reduce((best, b) =>
      Math.abs(b.count - count) < Math.abs(best.count - count) ? b : best,
    );
  }

  /** Latest price feed for a region (most recent date first). */
  async latestForRegion(region: string): Promise<PriceFeed | null> {
    return this.repo.findOne({
      where: { region },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * ₹/kg for an achieved count in a region, using the latest feed and the
   * nearest count band. Null when no feed exists for the region.
   */
  async priceForCount(region: string, count: number): Promise<number | null> {
    const feed = await this.latestForRegion(region);
    if (!feed) return null;
    const band = this.nearestBand(count, this.bandsFromPrices(feed.prices));
    return band ? band.price : null;
  }

  // ── CRUD for crowdsourced entries ───────────────────────────────────────
  create(data: Partial<PriceFeed>, userId: string): Promise<PriceFeed> {
    const entity = this.repo.create({ ...data, enteredBy: userId });
    return this.repo.save(entity);
  }

  findByRegion(region: string): Promise<PriceFeed[]> {
    return this.repo.find({
      where: { region },
      order: { date: 'DESC' },
      take: 60,
    });
  }
}
