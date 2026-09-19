import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

/**
 * One health sign seen (or explicitly checked and not seen: `level='none'`)
 * in one pond on one IST day. DDL: migration 1780701500000.
 */
@Entity('health_observations')
@Index(['pondId', 'observedOn'])
export class HealthObservation {
  /** Client-minted (saveRecord), so a replay is a no-op. */
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Column({ name: 'crop_id', type: 'uuid', nullable: true })
  cropId: string | null;

  @Column({ name: 'observed_on', type: 'date' })
  observedOn: string;

  @Column({ type: 'text' })
  sign: string;

  @Column({ type: 'text' })
  level: string;

  @Column({ name: 'sample_size', type: 'int', nullable: true })
  sampleSize: number | null;

  @Column({ type: 'int', nullable: true })
  count: number | null;

  @Column({ name: 'molt_deaths', type: 'int', nullable: true })
  moltDeaths: number | null;

  @Column({ type: 'text' })
  source: string;

  /** Server-filled from currentMoltWindow(observed_on); null in `inter`. */
  @Column({ name: 'window_key', type: 'varchar', nullable: true })
  windowKey: string | null;

  /** Photo PATHS (R2, under `health/`), never URLs. */
  @Column({ name: 'photo_urls', type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
