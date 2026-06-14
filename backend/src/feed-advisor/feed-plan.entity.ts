import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

/**
 * A generated daily feed recommendation (farmer_features_spec.md §3).
 * Stores the recommendation, the factor stack that produced it, and (once the
 * farmer logs what they actually fed) the adherence — feeding back into
 * rolling-FCR tracking.
 */
@Entity('feed_plans')
@Index(['pondId', 'date'])
export class FeedPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid', nullable: true })
  cropId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'biomass_kg', type: 'numeric' })
  biomassKg: number;

  @Column({ name: 'fr_pct', type: 'numeric' })
  frPct: number;

  @Column({ name: 'base_ration_kg', type: 'numeric' })
  baseRationKg: number;

  @Column({ name: 'recommended_kg', type: 'numeric' })
  recommendedKg: number;

  /** Per-meal split, e.g. [15.4, 15.4, 15.4, 15.4]. */
  @Column({ name: 'per_meal', type: 'simple-json' })
  perMeal: number[];

  /** The multipliers that shaped the ration: { tray, molt, env, fasting }. */
  @Column({ type: 'simple-json' })
  factors: Record<string, number>;

  /** Human-readable reason tags, e.g. ["−25% molt window", "−15% low DO"]. */
  @Column({ type: 'simple-json', nullable: true })
  reasons: string[] | null;

  @Column({ name: 'actual_kg', type: 'numeric', nullable: true })
  actualKg: number | null;

  /** actual / recommended, clamped to [0,1]; null until actual is logged. */
  @Column({ type: 'numeric', nullable: true })
  adherence: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
