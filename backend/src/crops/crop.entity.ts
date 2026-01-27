import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pond } from '../ponds/pond.entity';

@Entity('crops')
export class Crop {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'pond_id', type: 'uuid' })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    name: string;

    @Column({ name: 'crop_code', type: 'text', nullable: true })
    cropCode: string;

    @Column({ name: 'species_type', type: 'text', nullable: true })
    speciesType: string;

    @Column({ name: 'stocking_density', type: 'numeric', nullable: true })
    stockingDensity: number;

    @Column({ name: 'stocking_count', type: 'integer', nullable: true })
    stockingCount: number;

    @Column({ name: 'stocking_date', type: 'timestamp with time zone', nullable: true })
    stockingDate: Date;

    @Column({ name: 'expected_harvest_date', type: 'timestamp with time zone', nullable: true })
    expectedHarvestDate: Date;

    @Column({ name: 'actual_harvest_date', type: 'timestamp with time zone', nullable: true })
    actualHarvestDate: Date;

    @Column({ name: 'harvest_weight_kg', type: 'numeric', nullable: true })
    harvestWeightKg: number;

    @Column({ type: 'text', default: 'active' })
    status: string; // active, harvested, cancelled
}
