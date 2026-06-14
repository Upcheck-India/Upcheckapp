import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Frozen CropOutcome label record (data_collection_audit.md §5) — the
 * supervised ML targets, snapshotted immutably at harvest close. Without these
 * frozen at the right time, every model is unsupervised guesswork.
 */
@Entity('crop_outcomes')
export class CropOutcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // ── Production outcome ───────────────────────────────────────────────
  @Column({ name: 'final_sr_pct', type: 'numeric', nullable: true })
  finalSrPct: number | null;

  @Column({ name: 'final_fcr', type: 'numeric', nullable: true })
  finalFcr: number | null;

  @Column({ name: 'final_count', type: 'numeric', nullable: true })
  finalCount: number | null;

  @Column({ name: 'total_yield_kg', type: 'numeric', nullable: true })
  totalYieldKg: number | null;

  @Column({ name: 'productivity_t_ha', type: 'numeric', nullable: true })
  productivityTPerHa: number | null;

  @Column({ name: 'adg_mean', type: 'numeric', nullable: true })
  adgMean: number | null;

  @Column({ name: 'cultivation_days', type: 'int', nullable: true })
  cultivationDays: number | null;

  // ── Disease ──────────────────────────────────────────────────────────
  @Column({ name: 'disease_occurred', type: 'simple-json', nullable: true })
  diseaseOccurred: string[] | null;

  @Column({ name: 'disease_onset_doc', type: 'int', nullable: true })
  diseaseOnsetDoc: number | null;

  @Column({ name: 'disease_confirmed_by', type: 'text', nullable: true })
  diseaseConfirmedBy: string | null;

  @Column({ name: 'emergency_harvest', type: 'boolean', default: false })
  emergencyHarvest: boolean;

  @Column({ type: 'boolean', default: false })
  crash: boolean;

  // ── Economics ────────────────────────────────────────────────────────
  @Column({ type: 'numeric', nullable: true })
  revenue: number | null;

  @Column({ name: 'total_cost', type: 'numeric', nullable: true })
  totalCost: number | null;

  @Column({ type: 'numeric', nullable: true })
  profit: number | null;

  @Column({ name: 'cop_per_kg', type: 'numeric', nullable: true })
  copPerKg: number | null;

  @Column({ name: 'margin_pct', type: 'numeric', nullable: true })
  marginPct: number | null;

  @Column({ name: 'roi_pct', type: 'numeric', nullable: true })
  roiPct: number | null;

  // ── Labels ───────────────────────────────────────────────────────────
  @Column({ name: 'outcome_class', type: 'text' })
  outcomeClass: 'success' | 'partial' | 'failure';

  /** How much of the cycle was logged (0..1) — weights/cleans training rows. */
  @Column({ name: 'data_completeness_score', type: 'numeric', nullable: true })
  dataCompletenessScore: number | null;

  /** Immutable once frozen. */
  @CreateDateColumn({ name: 'frozen_at', type: 'timestamp with time zone' })
  frozenAt: Date;
}
