import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FeedbackReport } from './feedback.entity';

/**
 * Append-only staff note on a report — never edited or deleted from the
 * dashboard, only added to. `author` is free text (staff identity is
 * arriving via C5.1; see feedback.entity.ts's `respondedBy` for the same
 * pattern), not a user id: nothing keys off it.
 *
 * Migration 1780702600000. New table, RLS enabled there.
 */
@Entity('feedback_notes')
export class FeedbackNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @ManyToOne(() => FeedbackReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: FeedbackReport;

  @Column({ type: 'varchar', length: 120, nullable: true })
  author: string | null;

  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
