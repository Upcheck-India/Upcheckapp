import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pond } from '../ponds/pond.entity';

@Entity('feed_records')
export class FeedRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'pond_id', type: 'uuid' })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @CreateDateColumn({ name: 'recorded_at', type: 'timestamp with time zone' })
    recordedAt: Date;

    @Column({ name: 'feed_type', type: 'text' })
    feedType: string;

    @Column({ name: 'feed_brand', type: 'text', nullable: true })
    feedBrand: string;

    @Column({ name: 'quantity_kg', type: 'numeric' })
    quantityKg: number;

    @Column({ name: 'feeding_time', type: 'text', nullable: true })
    feedingTime: string; // morning, afternoon, evening, night

    @Column({ name: 'feeding_method', type: 'text', nullable: true })
    feedingMethod: string; // manual, automatic, broadcast

    @Column({ name: 'water_temperature', type: 'numeric', nullable: true })
    waterTemperature: number;

    @Column({ type: 'text', nullable: true })
    notes: string;
}
