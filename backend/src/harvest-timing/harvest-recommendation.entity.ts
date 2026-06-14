import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

/**
 * A generated harvest-timing recommendation (farmer_features_spec.md §1).
 * Distinct from the existing `harvest_plans` (manual planned schedules) — this
 * is the engine's verdict + projection.
 */
@Entity('harvest_recommendations')
@Index(['pondId', 'createdAt'])
export class HarvestRecommendation {
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

  @Column({ name: 'recommend_now', type: 'boolean' })
  recommendNow: boolean;

  @Column({ name: 'optimal_day', type: 'int' })
  optimalDay: number;

  @Column({ name: 'net_now', type: 'numeric' })
  netNow: number;

  @Column({ name: 'net_optimal', type: 'numeric' })
  netOptimal: number;

  @Column({ name: 'expected_gain', type: 'numeric' })
  expectedGain: number;

  /** Full per-day projection + partial plan (HarvestTimingResult). */
  @Column({ type: 'simple-json' })
  result: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
