import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Farm } from '../farms/farm.entity';

@Entity('ponds')
export class Pond {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    name: string;

    @Column({ name: 'pond_code', type: 'text', nullable: true })
    pondCode: string;

    @Column({ name: 'area_m2', type: 'numeric', nullable: true })
    areaM2: number;

    @Column({ name: 'depth_m', type: 'numeric', nullable: true })
    depthM: number;

    @Column({ name: 'species_type', type: 'text', nullable: true })
    speciesType: string;

    @Column({ name: 'stocking_date', type: 'timestamp with time zone', nullable: true })
    stockingDate: Date;

    @Column({ type: 'text', default: 'active' })
    status: string;
}
