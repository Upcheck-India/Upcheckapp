import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ type: 'varchar', unique: true, nullable: true })
    username: string | null;

    @Column({ name: 'password_hash', type: 'varchar', nullable: true })
    passwordHash: string | null;

    @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
    firstName: string | null;

    @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
    lastName: string | null;

    @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
    avatarUrl: string | null;

    @Column({ name: 'email_verified', type: 'boolean', default: false })
    emailVerified: boolean;

    @Column({ name: 'phone_verified', type: 'boolean', default: false })
    phoneVerified: boolean;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'verification_level', type: 'varchar', length: 20, default: 'basic' })
    verificationLevel: string; // basic, verified, certified

    @Column({ name: 'auth_provider', type: 'varchar', length: 20, default: 'email' })
    authProvider: string; // email, google, facebook, apple

    @Column({ type: 'jsonb', default: {} })
    preferences: Record<string, any>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
    lastLoginAt: Date | null;

    @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
    failedLoginAttempts: number;

    @Column({ name: 'locked_until', type: 'timestamp with time zone', nullable: true })
    lockedUntil: Date | null;

    // Legacy fields (kept for compatibility if needed, or remove if strictly following new spec)
    // For now, I'll strictly follow the new spec and remove fields that are not in the spec but were in the old entity if they conflict or are redundant.
    // The old entity had: roles, emailConfirmedAt, googleId (mapped to auth_provider/email), phoneNumber (mapped to phone), isEmailVerified (mapped to emailVerified), isPhoneVerified, is2faEnabled, totpSecret, backupCodes.
    // I will keep 'roles' as it is used in other parts of the app, likely.

    @Column({ type: 'simple-array', default: [] })
    roles: string[];

    @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
    googleId: string; // Keep for backward compatibility/OAuth
}
