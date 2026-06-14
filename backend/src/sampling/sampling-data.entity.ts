import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { Pond } from '../ponds/pond.entity';

@Entity('sampling_data')
export class SamplingData {
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

    @ManyToOne(() => Crop, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ type: 'date', name: 'sampling_date' })
    samplingDate: Date;

    @Column({ type: 'numeric', nullable: true, name: 'mbw_g' })
    mbwG: number; // Mean Body Weight in grams

    @Column({ type: 'int', nullable: true, name: 'total_samples' })
    totalSamples: number;

    @Column({ type: 'numeric', nullable: true, name: 'std_deviation' })
    stdDeviation: number;

    @Column({ type: 'numeric', nullable: true, name: 'biomass_estimation_kg' })
    biomassEstimationKg: number;

    @Column({ type: 'numeric', nullable: true, name: 'sr_estimation_percent' })
    srEstimationPercent: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'text', array: true, nullable: true, default: [], name: 'photo_urls' })
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
