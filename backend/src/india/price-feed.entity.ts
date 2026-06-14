import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Count-based price feed (jala_teardown_india.md §7). Indian shrimp is priced
 * **by count**, not a flat ₹/kg — bigger shrimp (lower count) fetch more. The
 * `prices` map is keyed by count band → ₹/kg, e.g. `{ "30": 520, "40": 430 }`.
 *
 * Crowdsourced primary (source = processor | local_agent | self); a CSV/API
 * adapter can populate the same table later (API deferred per PRD §14).
 */
@Entity('price_feeds')
@Index(['region', 'date'])
export class PriceFeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Market region, e.g. `AP-Nellore`, `AP-West Godavari`, `TN`, `Gujarat`. */
  @Index()
  @Column({ type: 'text' })
  region: string;

  @Column({ type: 'date' })
  date: string;

  /** count band → ₹/kg, e.g. { "30": 520, "40": 430, "50": 360 }. */
  @Column({ type: 'simple-json' })
  prices: Record<string, number>;

  /** `processor | local_agent | self`. */
  @Column({ type: 'text', default: 'self' })
  source: string;

  @Column({ name: 'entered_by', type: 'uuid', nullable: true })
  enteredBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
