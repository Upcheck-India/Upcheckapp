import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { DiseaseLibrary } from './disease-library.entity';

@Entity('disease_records')
export class DiseaseRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ name: 'disease_id', type: 'uuid' })
    diseaseId: string;

    @ManyToOne(() => DiseaseLibrary, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'disease_id' })
    disease: DiseaseLibrary;

    @Column({ type: 'date', name: 'recorded_date' })
    recordedDate: Date;

    @Column({ name: 'severity_at_detection', type: 'text', nullable: true })
    severityAtDetection: string; // high, medium, low

    @Column({ name: 'photo_urls', type: 'text', array: true, nullable: true, default: [] })
    photoUrls: string[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
