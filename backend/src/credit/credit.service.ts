import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditLedger } from './credit-ledger.entity';
import { CreateCreditDto } from './dto/create-credit.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Inventory credit + runout projection (farmer_features_spec.md §6). The
 * outstanding-balance and reorder math are pure; ledger persistence is scoped
 * to the authenticated user.
 */
@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(CreditLedger)
    private readonly repo: Repository<CreditLedger>,
  ) {}

  /** Outstanding = principal × (1 + interest%) − repaid, floored at 0. */
  outstanding(principal: number, interestPct: number, repaid: number): number {
    const owed = principal * (1 + (interestPct || 0) / 100) - (repaid || 0);
    return round2(Math.max(0, owed));
  }

  /** Days until stock runs out at the current daily burn rate. */
  daysToRunout(qty: number, dailyBurn: number): number {
    if (dailyBurn <= 0) return Infinity;
    return qty / dailyBurn;
  }

  /**
   * Reorder needed when below the threshold OR the projected runout is within
   * the supplier lead time.
   */
  reorderNeeded(
    qty: number,
    threshold: number,
    dailyBurn: number,
    leadTimeDays: number,
  ): boolean {
    if (qty < threshold) return true;
    return this.daysToRunout(qty, dailyBurn) <= leadTimeDays;
  }

  // ── Ledger persistence ──────────────────────────────────────────────────
  async create(
    data: CreateCreditDto,
    userId: string,
  ): Promise<CreditLedger> {
    const entity = this.repo.create({
      ...data,
      userId,
      repaid: data.repaid ?? 0,
    });
    return this.repo.save(entity);
  }

  async list(
    userId: string,
  ): Promise<Array<CreditLedger & { outstanding: number }>> {
    const rows = await this.repo.find({
      where: { userId },
      order: { startDate: 'DESC' },
    });
    return rows.map((r) => ({
      ...r,
      outstanding: this.outstanding(
        Number(r.principal),
        Number(r.interestPct),
        Number(r.repaid),
      ),
    }));
  }

  async recordRepayment(
    id: string,
    amount: number,
    userId: string,
  ): Promise<CreditLedger> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Credit entry not found');
    if (row.userId !== userId) throw new ForbiddenException();
    row.repaid = round2(Number(row.repaid) + amount);
    return this.repo.save(row);
  }

  /** Outstanding totals overall and per dealer (repay-from-harvest planner). */
  async summary(userId: string): Promise<{
    totalOutstanding: number;
    byDealer: Record<string, number>;
  }> {
    const rows = await this.list(userId);
    const byDealer: Record<string, number> = {};
    let totalOutstanding = 0;
    for (const r of rows) {
      totalOutstanding += r.outstanding;
      byDealer[r.dealerName] = round2(
        (byDealer[r.dealerName] ?? 0) + r.outstanding,
      );
    }
    return { totalOutstanding: round2(totalOutstanding), byDealer };
  }
}
