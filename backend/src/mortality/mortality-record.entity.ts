import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('mortality_records')
export class MortalityRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ type: 'text', array: true, nullable: true, default: [] })
    images: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
