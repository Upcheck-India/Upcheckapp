import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

@Entity('harvest_plans')
export class HarvestPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Column({ name: 'crop_id', type: 'uuid', nullable: true })
  cropId: string;

  @Column({
    name: 'planned_harvest_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  plannedHarvestDate: Date;

  @Column({ name: 'target_weight_kg', type: 'numeric', nullable: true })
  targetWeightKg: number;

  @Column({ name: 'expected_price_per_kg', type: 'numeric', nullable: true })
  expectedPricePerKg: number;

  @Column({ name: 'expected_revenue', type: 'numeric', nullable: true })
  expectedRevenue: number;

  @Column({
    name: 'actual_harvest_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  actualHarvestDate: Date;

  @Column({ name: 'actual_weight_kg', type: 'numeric', nullable: true })
  actualWeightKg: number;

  @Column({ name: 'actual_price_per_kg', type: 'numeric', nullable: true })
  actualPricePerKg: number;

  @Column({ name: 'actual_revenue', type: 'numeric', nullable: true })
  actualRevenue: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', default: 'planned' })
  status: string; // planned, completed, cancelled

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
