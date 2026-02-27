import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Pond } from '../ponds/pond.entity';

@Entity('water_quality_records')
export class WaterQualityRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'pond_id', type: 'uuid' })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @CreateDateColumn({ name: 'recorded_at', type: 'timestamp with time zone' })
    recordedAt: Date;

    @Column({ type: 'numeric', nullable: true })
    ph: number;

    @Column({ type: 'numeric', nullable: true })
    temperature: number; // Celsius

    @Column({ name: 'dissolved_oxygen', type: 'numeric', nullable: true })
    dissolvedOxygen: number; // mg/L

    @Column({ type: 'numeric', nullable: true })
    salinity: number; // ppt

    @Column({ type: 'numeric', nullable: true })
    ammonia: number; // mg/L

    @Column({ type: 'numeric', nullable: true })
    nitrite: number; // mg/L

    @Column({ type: 'numeric', nullable: true })
    nitrate: number; // mg/L

    @Column({ type: 'numeric', nullable: true })
    alkalinity: number; // mg/L CaCO3

    @Column({ type: 'numeric', nullable: true })
    hardness: number; // mg/L CaCO3

    @Column({ type: 'numeric', nullable: true })
    transparency: number; // cm (Secchi disk)

    @Column({ type: 'text', nullable: true })
    notes: string;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
