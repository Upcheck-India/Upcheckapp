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
   * Computes Day of Culture (DOC) dynamically based on stockingDate vs current date.
   * Returns 0 if stockingDate is not set or is in the future.
   * Also accounts for initialAgeDays at stocking time.
   */
  get computedDOC(): number {
    if (!this.stockingDate) return 0;
    const stocked = new Date(this.stockingDate);
    const now = new Date();
    const diffMs = now.getTime() - stocked.getTime();
    if (diffMs <= 0) return 0;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + (this.initialAgeDays || 0);
  }
}
