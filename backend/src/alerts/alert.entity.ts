import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @Column({ type: 'text' })
    type: string; // water_quality, feed_reminder, harvest, system

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'text', default: 'info' })
    severity: string; // info, warning, critical

    @Column({ name: 'is_read', type: 'boolean', default: false })
    isRead: boolean;

    @Column({ name: 'pond_id', type: 'uuid', nullable: true })
    pondId: string;

    @Column({ name: 'farm_id', type: 'uuid', nullable: true })
    farmId: string;
}
