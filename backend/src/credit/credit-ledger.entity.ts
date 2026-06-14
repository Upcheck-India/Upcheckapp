import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Dealer credit ledger (farmer_features_spec.md §6) — a major Indian debt
 * driver. Tracks principal + interest borrowed from input dealers and
 * repayments (often from harvest revenue).
 */
@Entity('credit_ledgers')
export class CreditLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid', nullable: true })
  cropId: string | null;

  @Column({ name: 'dealer_name', type: 'text' })
  dealerName: string;

  @Column({ type: 'numeric' })
  principal: number;

  /** Simple interest rate over the loan term (%). */
  @Column({ name: 'interest_pct', type: 'numeric', default: 0 })
  interestPct: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'numeric', default: 0 })
  repaid: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
