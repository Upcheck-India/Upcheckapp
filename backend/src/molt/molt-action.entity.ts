import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Pond } from '../ponds/pond.entity';

/**
 * A MANUAL molt-checklist tick for one pond in one molt window. Auto-derived
 * items are computed from logs and never stored. Un-tick = delete the row.
 * DDL: migration 1780700700000.
 */
@Entity('molt_actions')
@Unique(['pondId', 'windowKey', 'actionKey'])
export class MoltAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Column({ name: 'window_key', type: 'varchar' })
  windowKey: string;

  @Column({ name: 'action_key', type: 'varchar' })
  actionKey: string;

  @Column({ name: 'done_by', type: 'uuid', nullable: true })
  doneBy: string | null;

  @Column({ name: 'done_at', type: 'timestamptz', default: () => 'now()' })
  doneAt: Date;
}
