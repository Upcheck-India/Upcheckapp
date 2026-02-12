import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'token_hash', type: 'varchar' })
    tokenHash: string;

    @Column({ name: 'expires_at', type: 'timestamp with time zone' })
    expiresAt: Date;

    @Column({ name: 'is_revoked', type: 'boolean', default: false })
    isRevoked: boolean;

    @Column({ name: 'parent_token', type: 'varchar', nullable: true })
    parentToken: string; // The token that this one replaced (for rotation)

    @Column({ name: 'device_type', type: 'varchar', nullable: true })
    deviceType: string;

    @Column({ name: 'device_os', type: 'varchar', nullable: true })
    deviceOs: string;

    @Column({ name: 'browser', type: 'varchar', nullable: true })
    browser: string;

    @Column({ name: 'ip_address', type: 'varchar', nullable: true })
    ipAddress: string;

    @Column({ name: 'location', type: 'jsonb', nullable: true })
    location: any;

    @Column({ name: 'last_active_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    lastActiveAt: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
