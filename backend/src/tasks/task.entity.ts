import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
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

  // FEED | WATER_TEST | SAMPLING | AERATOR_CHECK | MORTALITY_CHECK | HARVEST_PREP | OTHER
  @Column({ type: 'text', default: 'OTHER' })
  type: string;

  // 'open' | 'in_progress' | 'done' | 'verified' | 'cancelled'
  @Index()
  @Column({ type: 'text', default: 'open' })
  status: string;

  // 'low' | 'medium' | 'high'
  @Column({ type: 'text', default: 'medium' })
  priority: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  // Daily window the task should run in (e.g. feeding 06:00–07:00). TIME type.
  @Column({ name: 'time_window_start', type: 'time', nullable: true })
  timeWindowStart: string | null;

  @Column({ name: 'time_window_end', type: 'time', nullable: true })
  timeWindowEnd: string | null;

  // RFC-5545-style rule for a recurring series (e.g. FREQ=DAILY;COUNT=90).
  @Column({ name: 'recurrence_rule', type: 'text', nullable: true })
  recurrenceRule: string | null;

  // Generated instances point back at the series origin.
  @Index()
  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId: string | null;

  // User id (Supabase auth id) the task is assigned to, if any.
  @Index()
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  completedAt: Date | null;

  // Manager verification of a completed task (blueprint §17.4).
  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by_id', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
