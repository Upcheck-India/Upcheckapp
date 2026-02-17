import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { Pond } from '../ponds/pond.entity';

export enum ExpenseCategory {
    FEED = 'Feed',
    PROBIOTICS = 'Chemicals/Probiotics',
    SEED = 'Seed (Fry)',
    LABOR = 'Labor',
    ENERGY = 'Energy (Fuel/Electricity)',
    MAINTENANCE = 'Maintenance',
    OTHER = 'Other'
}

@Entity('expenses')
export class Expense {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid', nullable: true })
    cropId: string | null;

    @ManyToOne(() => Crop, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ name: 'pond_id', type: 'uuid' })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'enum', enum: ExpenseCategory })
    category: ExpenseCategory;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string; // To track who recorded it

    @CreateDateColumn({ name: 'created_at' })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: string;
}
