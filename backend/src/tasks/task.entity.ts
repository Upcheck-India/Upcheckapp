import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Farm } from '../farms/farm.entity';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    // Optional scoping to a pond / crop. Kept as plain columns (no eager relation
    // needed) with FKs declared in the migration for referential integrity.
    @Index()
    @Column({ name: 'pond_id', type: 'uuid', nullable: true })
    pondId: string | null;

    @Index()
    @Column({ name: 'crop_id', type: 'uuid', nullable: true })
    cropId: string | null;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    // 'open' | 'in_progress' | 'done'
    @Index()
    @Column({ type: 'text', default: 'open' })
    status: string;

    // 'low' | 'medium' | 'high'
    @Column({ type: 'text', default: 'medium' })
    priority: string;

    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate: string | null;

    // User id (Supabase auth id) the task is assigned to, if any.
    @Index()
    @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
    assignedToId: string | null;

    @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
    createdById: string | null;

    @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
    completedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
