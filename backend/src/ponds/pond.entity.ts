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

    @Column({ name: 'name_prefix', type: 'text', nullable: true })
    namePrefix: string;

    @Column({ name: 'auto_number', type: 'int', nullable: true })
    autoNumber: number;

    @Column({ name: 'pond_code', type: 'text', nullable: true })
    pondCode: string;

    @Column({ type: 'text', nullable: true })
    type: string; // 'square' | 'circle'

    @Column({ name: 'length_m', type: 'numeric', nullable: true })
    lengthM: number;

    @Column({ name: 'width_m', type: 'numeric', nullable: true })
    widthM: number;

    @Column({ name: 'area_m2', type: 'numeric', nullable: true })
    areaM2: number;

    @Column({ name: 'depth_m', type: 'numeric', nullable: true })
    depthM: number;

    @Column({ name: 'rfid_tag', type: 'text', nullable: true })
    rfidTag: string;

    @Column({ name: 'species_type', type: 'text', nullable: true })
    speciesType: string;

    @Column({ name: 'stocking_date', type: 'timestamp with time zone', nullable: true })
    stockingDate: Date;

    @Column({ type: 'text', default: 'active' })
    status: string; // 'active' | 'inactive' | 'empty'
}
