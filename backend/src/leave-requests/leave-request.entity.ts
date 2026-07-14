import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Farm } from '../farms/farm.entity';
import { User } from '../auth/user.entity';

// Stored as plain text (no DB enum), same convention as Task.status —
// extensible without a migration.
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('leave_requests')
export class LeaveRequest {
  // Plain @PrimaryColumn (not @PrimaryGeneratedColumn) so a client-minted
  // UUID from the offline sync queue is the row's real id — same idempotent-
  // replay pattern as AttendanceRecord.
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'farm_id', type: 'uuid' })
  farmId: string;

  @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farm_id' })
  farm: Farm;

  // The worker requesting leave.
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Index()
  @Column({ type: 'text', default: 'pending' })
  status: LeaveRequestStatus;

  @Column({ name: 'decided_by_id', type: 'uuid', nullable: true })
  decidedById: string | null;

  @Column({
    name: 'decided_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  decidedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
