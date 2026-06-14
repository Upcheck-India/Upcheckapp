import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Versioned data dictionary / feature catalog (PRD §8.A, §10).
 *
 * Every measurable parameter is coded here — coded enums (not free text),
 * canonical unit, value type, and validation range. The {@link MeasurementService}
 * validates every incoming value against the active dictionary entry for its
 * `param`, so a value can never enter the pipeline with an unknown param, the
 * wrong unit, or an out-of-range magnitude.
 *
 * "Schema changes are migrations": a new revision of a param is a new row with
 * an incremented {@link version}; the previous row is marked `isActive = false`
 * rather than mutated, preserving the historical definition a stored
 * measurement was validated against.
 *
 * Cross-database note: enum-like fields are stored as `text` (not Postgres
 * `enum`) so the same entity works under the SQLite test harness.
 */
@Entity('data_dictionary')
@Index(['param', 'version'], { unique: true })
export class DataDictionaryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Coded parameter key, e.g. `do`, `ph`, `salinity`, `nh3`, `abw`. */
  @Index()
  @Column({ type: 'text' })
  param: string;

  /** Human-readable label, e.g. "Dissolved Oxygen". */
  @Column({ type: 'text' })
  label: string;

  /** Grouping: `water_quality | chemistry | plankton | microbiology | feed | sampling | health | mortality | ...`. */
  @Index()
  @Column({ type: 'text' })
  category: string;

  /** `numeric | categorical | boolean`. Drives which value column is used. */
  @Column({ name: 'value_type', type: 'text', default: 'numeric' })
  valueType: 'numeric' | 'categorical' | 'boolean';

  /** Canonical unit (e.g. `mg/L`, `ppt`, `°C`, `g`). Empty for unitless/categorical. */
  @Column({ type: 'text', default: '' })
  unit: string;

  /** Allowed coded values for `categorical` params (JSON array of strings). */
  @Column({ name: 'allowed_values', type: 'simple-json', nullable: true })
  allowedValues: string[] | null;

  /** Inclusive validation minimum for `numeric` params (null = unbounded). */
  @Column({ name: 'min_value', type: 'numeric', nullable: true })
  minValue: number | null;

  /** Inclusive validation maximum for `numeric` params (null = unbounded). */
  @Column({ name: 'max_value', type: 'numeric', nullable: true })
  maxValue: number | null;

  /** Dictionary revision. A new revision supersedes the prior `isActive` row. */
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
