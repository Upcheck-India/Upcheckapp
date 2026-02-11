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
}
