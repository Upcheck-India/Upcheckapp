import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FeedRecord } from '../feed-records/feed-record.entity';
import { Crop } from '../crops/crop.entity';

@Entity('feeding_tray_checks')
export class FeedingTrayCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Hot-path filter column (feeding-tray-checks.service findAll, pond-context
  // findOne) with no auto-created FK index in Postgres (AUDIT id 146).
  @Index()
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Column({ name: 'feed_record_id', type: 'uuid', nullable: true })
  feedRecordId: string;

  @ManyToOne(() => FeedRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'feed_record_id' })
  feedRecord: FeedRecord;

  @Column({ type: 'date', name: 'check_date' })
  checkDate: Date;

  @Column({ type: 'time', name: 'check_time' })
  checkTime: string;

  @Column({ type: 'int', name: 'tray_number' })
  trayNumber: number;

  @Column({ type: 'text', name: 'remaining_feed_status' })
  remainingFeedStatus: string; // 'empty' | 'few_left' | 'a_lot_left'

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
