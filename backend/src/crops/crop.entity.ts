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
import { Hatchery } from '../reference/entities/hatchery.entity';
import { Species } from '../reference/entities/species.entity';
import { Broodstock } from '../reference/entities/broodstock.entity';
import { toIstDateString } from '../common/ist-date';

/** Midnight (UTC ms) of the IST calendar day for a `date` column or instant. */
function istCalendarMs(value: string | Date): number {
  // A `date` column comes back as 'YYYY-MM-DD'; a timestamp as a Date object.
  const iso = typeof value === 'string' ? value.slice(0, 10) : toIstDateString(value);
  return Date.parse(iso);
}

/**
 * Day of Culture — the single source of truth for crops, the entity getter and
 * measurement DOC derivation. Convention: the stocking day itself is DOC 1
 * (industry standard), days counted on the IST calendar (not UTC, so a dawn
 * pond check before 05:30 IST no longer undercounts by one), offset by any age
 * the seed already carried at stocking. Returns null when there is no stocking
 * date or the reference instant precedes it.
 */
export function computeDoc(
  stockingDate: string | Date | null | undefined,
  initialAgeDays = 0,
  asOf: Date = new Date(),
): number | null {
  if (!stockingDate) return null;
  const diffDays = Math.floor(
    (istCalendarMs(asOf) - istCalendarMs(stockingDate)) / 86400000,
  );
  if (diffDays < 0) return null;
  return diffDays + 1 + (initialAgeDays || 0);
}

@Entity('crops')
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Index()
  @Column({ name: 'farm_id', type: 'uuid', nullable: true })
  farmId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'crop_code', type: 'text', nullable: true })
  cropCode: string;

  // Stocking Info
  @Column({ name: 'total_seed', type: 'int', nullable: true })
  totalSeed: number;

  @Column({ name: 'seed_type', type: 'text', nullable: true })
  seedType: string; // 'net' | 'gross' | 'actual'

  @Column({ name: 'stocking_date', type: 'date', nullable: true })
  stockingDate: Date;

  @Column({ name: 'initial_age_days', type: 'int', default: 0 })
  initialAgeDays: number;

  @Column({ name: 'preparation_days', type: 'int', default: 0 })
  preparationDays: number;

  @Column({ name: 'total_feeding_trays', type: 'int', default: 4 })
  totalFeedingTrays: number;

  // Reference FKs
  @Index()
  @Column({ name: 'hatchery_id', type: 'uuid', nullable: true })
  hatcheryId: string;

  @ManyToOne(() => Hatchery, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hatchery_id' })
  hatchery: Hatchery;

  @Index()
  @Column({ name: 'species_id', type: 'uuid', nullable: true })
  speciesId: string;

  @ManyToOne(() => Species, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'species_id' })
  species: Species;

  @Index()
  @Column({ name: 'broodstock_id', type: 'uuid', nullable: true })
  broodstockId: string;

  @ManyToOne(() => Broodstock, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'broodstock_id' })
  broodstock: Broodstock;

  @Column({ name: 'species_type', type: 'text', nullable: true })
  speciesType: string;

  @Column({ name: 'stocking_density', type: 'numeric', nullable: true })
  stockingDensity: number;

  @Column({ name: 'stocking_count', type: 'integer', nullable: true })
  stockingCount: number;

  @Column({ name: 'feed_price_rp_per_kg', type: 'int', nullable: true })
  feedPriceRpPerKg: number;

  // Cycle Targets
  @Column({ name: 'carrying_capacity_kg_m2', type: 'numeric', default: 1.25 })
  carryingCapacityKgM2: number;

  @Column({ name: 'target_cultivation_days', type: 'int', default: 120 })
  targetCultivationDays: number;

  @Column({ name: 'target_size', type: 'int', nullable: true })
  targetSize: number; // pieces/kg

  @Column({ name: 'target_sr_percent', type: 'numeric', default: 75.0 })
  targetSrPercent: number;

  @Column({ name: 'sr_prediction_method', type: 'text', default: 'feed_ratio' })
  srPredictionMethod: string; // 'feed_ratio' | 'fixed' | 'measurements' | 'stp_table' | 'custom_table'

  @Column({ type: 'int', default: 0 })
  doc: number; // Day of Culture

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'expected_harvest_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expectedHarvestDate: Date;

  @Column({
    name: 'actual_harvest_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  actualHarvestDate: Date;

  @Column({ name: 'harvest_weight_kg', type: 'numeric', nullable: true })
  harvestWeightKg: number;

  @Column({ type: 'text', default: 'active' })
  status: string; // 'active' | 'completed' | 'cancelled'

  /**
   * Day of Culture for API responses. Delegates to the shared IST-calendar
   * `computeDoc` (stocking day = 1) so the crop card, service and measurement
   * history all agree; 0 when unstocked/future to preserve the response shape.
   */
  get computedDOC(): number {
    return computeDoc(this.stockingDate, this.initialAgeDays) ?? 0;
  }
}
