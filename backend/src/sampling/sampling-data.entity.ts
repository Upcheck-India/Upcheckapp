import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('sampling_data')
export class SamplingData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
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
}
