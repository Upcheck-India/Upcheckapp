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

@Entity('attendance_records')
export class AttendanceRecord {
  // Plain @PrimaryColumn (not @PrimaryGeneratedColumn) so the client-minted
  // UUID from the offline sync queue (recordSync.ts's saveRecord) is the row's
  // real id, not discarded in favor of a server-generated one — required for
  // the idempotent-replay pattern used by every other loggable entity.
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'farm_id', type: 'uuid' })
  farmId: string;

  @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farm_id' })
  farm: Farm;

  // Who this attendance record is for — the worker checking in, not
  // necessarily the caller (a manager may back-fill a worker's record).
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Plain @Column so an offline-queued check-in keeps the time it actually
  // happened at, not the time the sync drain eventually ran (same reasoning
  // as WaterQualityRecord.recordedAt).
  @Column({
    name: 'check_in_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  checkInAt: Date;

  @Column({
    name: 'check_out_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  checkOutAt: Date | null;

  // Who closed the shift: the member ('self'), a manager correcting it, or the
  // member's own check-in elsewhere ('auto_closed'). Spec 2026-09-14 B.1/B.6.
  @Column({ name: 'checked_out_by', type: 'uuid', nullable: true })
  checkedOutById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'checked_out_by' })
  checkedOutBy: User | null;

  // self | forgot | left_early | shift_end | auto_closed | other
  @Column({
    name: 'check_out_reason',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  checkOutReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
