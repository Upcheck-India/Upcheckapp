import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('otp_codes')
export class OtpCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    phone: string;

    @Column({ type: 'text' })
    code: string;

    @Column({ name: 'expires_at', type: 'timestamp with time zone' })
    expiresAt: Date;

    @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
    verifiedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
