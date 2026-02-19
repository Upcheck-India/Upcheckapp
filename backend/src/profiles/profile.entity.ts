import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('profiles')
export class Profile {
    @PrimaryColumn('uuid')
    id: string;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text', nullable: true })
    email: string;

    @Column({ type: 'text', unique: true, nullable: true })
    username: string;

    @Column({ name: 'full_name', type: 'text', nullable: true })
    fullName: string;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl: string;

    @Column({ type: 'text', nullable: true })
    website: string;

    @Column({ name: 'language_preference', type: 'text', default: 'en', nullable: true })
    languagePreference: string;
}
