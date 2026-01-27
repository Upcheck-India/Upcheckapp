import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @Column({ name: 'email_confirmed_at', type: 'timestamp with time zone', nullable: true })
    emailConfirmedAt: Date;
}
