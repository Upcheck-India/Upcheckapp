import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, DeleteDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';

// Valid values: 'tidal' | 'river' | 'borehole' | 'reservoir' | 'recycled'
export type WaterSourceType = string;

@Entity('farms')
export class Farm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    name: string;

    @Column({ name: 'farm_code', type: 'varchar', length: 8, unique: true, nullable: true })
    farmCode: string;

    @Column({ name: 'area_hectares', type: 'numeric', nullable: true })
    areaHectares: number;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'numeric', nullable: true })
    longitude: number;

    @Column({ type: 'numeric', nullable: true })
    latitude: number;

    @Column({ name: 'water_source_type', type: 'varchar', length: 20, nullable: true })
    waterSourceType: string;

    // Declared by the owner during first-run farm setup; the guided pond-creation
    // step uses it to know how many ponds to scaffold. Nullable for legacy farms.
    @Column({ name: 'planned_pond_count', type: 'integer', nullable: true })
    plannedPondCount: number;

    @Column({ name: 'qr_code_url', type: 'text', nullable: true })
    qrCodeUrl: string;

    @Column({ name: 'privacy_setting', type: 'text', default: 'private' })
    privacySetting: string;

    @Column({ type: 'jsonb', nullable: true })
    boundary: { latitude: number, longitude: number }[];

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
    deletedAt: Date;
}
