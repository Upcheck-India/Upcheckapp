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
import { Crop } from '../crops/crop.entity';

@Entity('mortality_records')
export class MortalityRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Column({ type: 'date', name: 'record_date' })
  recordDate: Date;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'numeric', nullable: true, name: 'estimated_weight_kg' })
  estimatedWeightKg: number;

  @Column({ type: 'int', nullable: true, name: 'estimated_total' })
  estimatedTotal: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  // P7: dead column, superseded by photoUrls (never read anywhere; only
  // written by the create DTO). Removed from the entity; the column itself
  // is dropped in a later cleanup migration, not here.

  // D6 (migration 1780701500000): unknown | low_do | disease | molt | handling | predator | other
  @Column({ name: 'suspected_cause', type: 'text', nullable: true })
  suspectedCause: string | null;

  /** Photo paths (R2, under `health/`), signed on read. */
  @Column({ name: 'photo_urls', type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
