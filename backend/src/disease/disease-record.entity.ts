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
import { DiseaseLibrary } from './disease-library.entity';

@Entity('disease_records')
export class DiseaseRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Index()
  @Column({ name: 'disease_id', type: 'uuid' })
  diseaseId: string;

  // RESTRICT, not SET NULL: disease_id is NOT NULL (H5, migration 1780701300000).
  @ManyToOne(() => DiseaseLibrary, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'disease_id' })
  disease: DiseaseLibrary;

  @Column({ type: 'date', name: 'recorded_date' })
  recordedDate: Date;

  /** Legacy free text (old clients). `severity` is the normalised value. */
  @Column({ name: 'severity_at_detection', type: 'text', nullable: true })
  severityAtDetection: string;

  // ── D6 (migration 1780701500000) ──
  /** Health sign keys (health-observations/health.constants.ts). */
  @Column({ name: 'symptom_signs', type: 'text', array: true, default: '{}' })
  symptomSigns: string[];

  /** mild | moderate | severe */
  @Column({ type: 'text', nullable: true })
  severity: string | null;

  @Column({ name: 'affected_pct', type: 'numeric', nullable: true })
  affectedPct: number | null;

  /** suspected | microscopy | pcr | lab_other */
  @Column({ name: 'confirmed_by', type: 'text', nullable: true })
  confirmedBy: string | null;

  @Column({ name: 'confirmed_on', type: 'date', nullable: true })
  confirmedOn: string | null;

  @Column({ name: 'lab_name', type: 'text', nullable: true })
  labName: string | null;

  /** ongoing | recovered | emergency_harvest | crop_lost */
  @Column({ type: 'text', default: 'ongoing' })
  outcome: string;

  @Column({ name: 'resolved_on', type: 'date', nullable: true })
  resolvedOn: string | null;

  @Column({
    name: 'photo_urls',
    type: 'text',
    array: true,
    nullable: true,
    default: [],
  })
  photoUrls: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;

  // Server-evaluated at write time (BANNED-1) — never trust a client-sent
  // value for these; DiseaseService recomputes them from notes on every
  // create/update against the backend's own BANNED_SUBSTANCES list.
  @Column({
    name: 'banned_substance_flag',
    type: 'text',
    default: 'none',
  })
  bannedSubstanceFlag: 'none' | 'restricted' | 'banned';

  @Column({
    name: 'banned_substance_matches',
    type: 'text',
    array: true,
    default: [],
  })
  bannedSubstanceMatches: string[];

  @Column({
    name: 'banned_substance_list_version',
    type: 'text',
    nullable: true,
  })
  bannedSubstanceListVersion: string | null;
}
