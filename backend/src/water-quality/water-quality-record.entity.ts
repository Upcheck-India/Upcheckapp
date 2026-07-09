import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

@Entity('water_quality_records')
export class WaterQualityRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  // Plain @Column (not @CreateDateColumn) so a client-supplied measurement
  // time can be persisted — TypeORM unconditionally overwrites
  // @CreateDateColumn with `new Date()` on insert, which would stamp an
  // offline-queued reading with sync time instead of when it was taken
  // (AUDIT id 31). DB default covers the common case where the client omits it.
  @Column({
    name: 'recorded_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  recordedAt: Date;

  @Column({ type: 'numeric', nullable: true })
  ph: number;

  @Column({ type: 'numeric', nullable: true })
  temperature: number; // Celsius

  @Column({ name: 'dissolved_oxygen', type: 'numeric', nullable: true })
  dissolvedOxygen: number; // mg/L

  @Column({ type: 'numeric', nullable: true })
  salinity: number; // ppt

  @Column({ type: 'numeric', nullable: true })
  ammonia: number; // mg/L

  @Column({ type: 'numeric', nullable: true })
  nitrite: number; // mg/L

  @Column({ type: 'numeric', nullable: true })
  nitrate: number; // mg/L

  @Column({ type: 'numeric', nullable: true })
  alkalinity: number; // mg/L CaCO3

  @Column({ type: 'numeric', nullable: true })
  hardness: number; // mg/L CaCO3

  @Column({ type: 'numeric', nullable: true })
  transparency: number; // cm (Secchi disk)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
