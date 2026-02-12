import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ name: 'password_hash', type: 'varchar', nullable: true })
    passwordHash: string;

    @Column({ type: 'simple-array', default: [] })
    roles: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @Column({ name: 'email_confirmed_at', type: 'timestamp with time zone', nullable: true })
    emailConfirmedAt: Date;

    @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
    googleId: string;

    @Column({ name: 'phone_number', type: 'varchar', unique: true, nullable: true })
    phoneNumber: string;

    @Column({ name: 'is_email_verified', type: 'boolean', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
    isPhoneVerified: boolean;

    @Column({ name: 'is_2fa_enabled', type: 'boolean', default: false })
    is2faEnabled: boolean;

    @Column({ name: 'totp_secret', type: 'varchar', nullable: true })
    totpSecret: string; // Encrypted

    @Column({ name: 'backup_codes', type: 'simple-array', nullable: true })
    backupCodes: string[]; // Encrypted hashes

    @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
    lastLoginAt: Date;

    @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
    failedLoginAttempts: number;

    @Column({ name: 'locked_until', type: 'timestamp with time zone', nullable: true })
    lockedUntil: Date;

    @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
    avatarUrl: string;
}
