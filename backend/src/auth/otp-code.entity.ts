import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('otp_codes')
export class OtpCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ type: 'varchar', length: 255 })
    code: string;

    @Column({ name: 'code_type', type: 'varchar', length: 20, default: 'login' })
    codeType: string; // login, email_verify, password_reset

    @Column({ name: 'expires_at', type: 'timestamp with time zone' })
    expiresAt: Date;

    @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
    verifiedAt: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @Column({ name: 'attempt_count', type: 'int', default: 0 })
    attemptCount: number;

    @Column({ name: 'is_used', type: 'boolean', default: false })
    isUsed: boolean;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
