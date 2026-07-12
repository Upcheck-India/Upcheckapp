import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-language override for the translatable fields of a disease_library row.
 * name/scientificName/commonNames deliberately stay on disease_library only
 * (untranslated) — disease codes and abbreviations (WSSV, EHP, AHPND/EMS…)
 * are used as-is across Indian aquaculture literature in every language, the
 * same convention already applied to DiagnoseScreen's disease names.
 *
 * No 'en' row is ever inserted here — English is the disease_library row
 * itself, and DiseaseService falls back to it whenever a translation is
 * missing for the requested locale (or for locales this table has none for).
 */
@Entity('disease_library_translations')
@Index(['diseaseId', 'locale'], { unique: true })
export class DiseaseLibraryTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'disease_id', type: 'uuid' })
  diseaseId: string;

  /** ISO-ish app language code: hi/ta/te/bn/or (matches frontend i18n). */
  @Column({ type: 'varchar', length: 8 })
  locale: string;

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  symptoms: string[];

  @Column({
    name: 'prevention_measures',
    type: 'text',
    array: true,
    nullable: true,
    default: [],
  })
  preventionMeasures: string[];

  @Column({
    name: 'treatment_recommendations',
    type: 'text',
    array: true,
    nullable: true,
    default: [],
  })
  treatmentRecommendations: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
