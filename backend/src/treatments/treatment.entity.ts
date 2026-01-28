import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('treatments')
export class Treatment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ type: 'date', name: 'treatment_date' })
    treatmentDate: Date;

    @Column({ type: 'text', nullable: true, name: 'based_on' })
    basedOn: string; // 'written_notes' | 'product_usage'

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'uuid', nullable: true, name: 'product_id' })
    productId: string;

    @Column({ type: 'numeric', nullable: true, name: 'dosage_kg' })
    dosageKg: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
