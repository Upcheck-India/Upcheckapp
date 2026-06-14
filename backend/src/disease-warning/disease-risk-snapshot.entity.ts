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
 * A point-in-time disease risk assessment for a pond
 * (farmer_features_spec.md §2): the ranked per-disease scores, their triggering
 * indicators, and the corrective steps.
 */
@Entity('disease_risk_snapshots')
@Index(['pondId', 'date'])
export class DiseaseRiskSnapshot {
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

  /** Ranked DiseaseRisk[] (disease, score, band, triggers[], steps[]). */
  @Column({ type: 'simple-json' })
  risks: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
