import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

    @Column({ name: 'farm_code', type: 'text', nullable: true })
    farmCode: string;

    @Column({ name: 'area_hectares', type: 'numeric', nullable: true })
    areaHectares: number;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'numeric', nullable: true })
    longitude: number;

    @Column({ type: 'numeric', nullable: true })
    latitude: number;

    @Column({ name: 'qr_code_url', type: 'text', nullable: true })
    qrCodeUrl: string;

    @Column({ name: 'privacy_setting', type: 'text', default: 'private' })
    privacySetting: string;
}
