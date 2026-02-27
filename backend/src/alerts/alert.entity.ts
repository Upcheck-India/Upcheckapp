import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../auth/user.entity';
import { Pond } from '../ponds/pond.entity';
import { Farm } from '../farms/farm.entity';

@Entity('alerts')
export class Alert {
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

    @Column({ type: 'text' })
    type: string; // water_quality, feed_reminder, harvest, system

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'text', default: 'info' })
    severity: string; // info, warning, critical

    @Index()
    @Column({ name: 'is_read', type: 'boolean', default: false })
    isRead: boolean;

    @Index()
    @Column({ name: 'pond_id', type: 'uuid', nullable: true })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @Index()
    @Column({ name: 'farm_id', type: 'uuid', nullable: true })
    farmId: string;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, any>;

    @Column({ name: 'is_push_sent', type: 'boolean', default: false })
    isPushSent: boolean;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
