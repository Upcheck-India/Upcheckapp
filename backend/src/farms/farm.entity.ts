import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Valid values: 'tidal' | 'river' | 'borehole' | 'reservoir' | 'recycled'
export type WaterSourceType = string;

@Entity('farms')
export class Farm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

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

    @Column({ name: 'qr_code_url', type: 'text', nullable: true })
    qrCodeUrl: string;

    @Column({ name: 'privacy_setting', type: 'text', default: 'private' })
    privacySetting: string;

    @Column({ type: 'jsonb', nullable: true })
    boundary: { latitude: number, longitude: number }[];

    @Column({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
    deletedAt: Date;
}
