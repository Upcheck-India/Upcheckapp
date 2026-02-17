import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('login_history')
export class LoginHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'login_method', type: 'varchar', length: 20 })
    loginMethod: string;

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
    userAgent: string;

    @Column({ name: 'device_info', type: 'varchar', length: 255, nullable: true })
    deviceInfo: string;

    @Column({ name: 'location', type: 'jsonb', nullable: true })
    location: any;

    @Column({ type: 'boolean', default: true })
    success: boolean;

    @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
    failureReason: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
