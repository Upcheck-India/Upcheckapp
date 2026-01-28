import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('disease_library')
export class DiseaseLibrary {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    name: string; // e.g., "AHPND/EMS"

    @Column({ name: 'scientific_name', type: 'text', nullable: true })
    scientificName: string;

    @Column({ type: 'text', array: true, nullable: true, default: [] })
    commonNames: string[];

    @Column({ type: 'text', array: true, nullable: true, default: [] })
    symptoms: string[];

    @Column({ name: 'prevention_measures', type: 'text', array: true, nullable: true, default: [] })
    preventionMeasures: string[];

    @Column({ name: 'treatment_recommendations', type: 'text', array: true, nullable: true, default: [] })
    treatmentRecommendations: string[];

    @Column({ name: 'image_urls', type: 'text', array: true, nullable: true, default: [] })
    imageUrls: string[];

    @Column({ name: 'severity_level', type: 'text', nullable: true })
    severityLevel: string; // high, medium, low

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
