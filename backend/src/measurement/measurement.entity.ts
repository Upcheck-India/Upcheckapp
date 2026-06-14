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
import { Pond } from '../ponds/pond.entity';

export type MeasurementSource =
  | 'manual'
  | 'sensor'
  | 'lab'
  | 'derived'
  | 'photo_ai';

// data_collection_audit.md §3 lists diurnal buckets; §4 also wants explicit
// AM/PM. We accept both so callers can use whichever granularity they capture.
export type TimeOfDay =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'evening'
  | 'night'
  | 'AM'
  | 'PM';

export type MissingReason = 'not_measured' | 'not_applicable' | 'sensor_fail';

/**
 * The keystone Measurement envelope (PRD §6.2).
 *
 * ONE schema for ALL sources — manual today, sensor/lab/photo-AI tomorrow.
 * Engines (feed, disease, harvest, aeration, P&L) read `param/value/unit`
 * and never branch on `source`, so no engine changes when IoT deploys.
 *
 * Design guarantees:
 * - **null ≠ 0** — a value that was not taken carries `isMissingReason` with
 *   `valueNum`/`valueText` null, distinct from a real measured zero.
 * - **Immutable raw + edit log** — a measurement's value is never mutated. An
 *   edit appends a NEW row with `editedFrom` pointing at the original, and the
 *   original is flagged `isSuperseded = true`. The full edit chain is therefore
 *   recoverable, and the raw first reading is preserved for ML/audit.
 * - **Idempotent ingest** — the client may supply the `id` (a UUIDv4 minted
 *   offline); re-sending the same row is a no-op, which makes queued offline
 *   sync safe to retry.
 *
 * Cross-database note: enum-like fields are `text` (not Postgres `enum`) so the
 * entity also works under the SQLite test harness.
 */
@Entity('measurements')
@Index(['pondId', 'param', 'measuredAt'])
@Index(['cropId', 'param', 'measuredAt'])
export class Measurement {
  /** UUID — may be client-supplied for idempotent offline sync. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  /** Crop/cycle this reading belongs to. Null for pre-stocking pond readings. */
  @Index()
  @Column({ name: 'crop_id', type: 'uuid', nullable: true })
  cropId: string | null;

  /** Day of culture, auto-derived from the crop stocking date when omitted. */
  @Column({ type: 'int', nullable: true })
  doc: number | null;

  /** Coded parameter key — must resolve to an active data-dictionary entry. */
  @Index()
  @Column({ type: 'text' })
  param: string;

  /** Numeric reading (for `numeric`/`boolean` params). Null when missing. */
  @Column({ name: 'value_num', type: 'numeric', nullable: true })
  valueNum: number | null;

  /** Coded/text reading (for `categorical` params). Null when missing. */
  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;

  /** Unit as recorded; validated against the dictionary canonical unit. */
  @Column({ type: 'text', default: '' })
  unit: string;

  @Column({ name: 'measured_at', type: 'timestamp with time zone' })
  measuredAt: Date;

  /** `AM | PM` slot (PRD water-quality time-of-day); null if not applicable. */
  @Column({ name: 'time_of_day', type: 'text', nullable: true })
  timeOfDay: TimeOfDay | null;

  @Column({ type: 'text', default: 'manual' })
  source: MeasurementSource;

  /** Instrument used (e.g. "DO meter", "refractometer"). */
  @Column({ type: 'text', nullable: true })
  instrument: string | null;

  /** Device that produced the reading (sensors, P3). Null for manual. */
  @Column({ name: 'device_id', type: 'text', nullable: true })
  deviceId: string | null;

  /** User who entered/owns the reading. Null for pure sensor ingest. */
  @Index()
  @Column({ name: 'entered_by', type: 'uuid', nullable: true })
  enteredBy: string | null;

  /** Role of the enterer (farmer/worker/technician/lab) for ML quality
   *  weighting — different sources carry different bias/noise (audit §3). */
  @Column({ name: 'entered_by_role', type: 'text', nullable: true })
  enteredByRole: string | null;

  /** Source confidence in [0,1]; defaults to 1 for manual/lab. */
  @Column({ type: 'numeric', nullable: true })
  confidence: number | null;

  /** Why a value is absent — preserves null ≠ 0. */
  @Column({ name: 'is_missing_reason', type: 'text', nullable: true })
  isMissingReason: MissingReason | null;

  /** The measurement this row was edited from (edit-log chain head → tail). */
  @Column({ name: 'edited_from', type: 'uuid', nullable: true })
  editedFrom: string | null;

  /** True once a newer edited row supersedes this one (raw value untouched). */
  @Column({ name: 'is_superseded', type: 'boolean', default: false })
  isSuperseded: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
