import { MigrationInterface, QueryRunner } from 'typeorm';

const VIBRIO = 'Vibrio spp.';

/**
 * Vibriosis treatment text, as seeded (1746000000000 / 1780301900000) and as
 * it becomes. Only rows still EQUAL to the seeded text are touched, so an
 * admin's edit survives. Exported for `disease-library.safety.spec.ts`.
 */
export const VIBRIO_TREATMENT_FIX: Array<{
  locale: string;
  from: string[];
  to: string[];
}> = [
  {
    locale: 'en',
    from: ['Antibiotics', 'Probiotics', 'Water exchange'],
    to: [
      'Consult a fisheries officer or aquatic animal health lab',
      'Probiotics',
      'Water exchange',
    ],
  },
  {
    locale: 'hi',
    from: ['एंटीबायोटिक्स', 'प्रोबायोटिक्स', 'जल विनिमय'],
    to: [
      'मत्स्य अधिकारी या जलीय पशु स्वास्थ्य प्रयोगशाला से सलाह लें',
      'प्रोबायोटिक्स',
      'जल विनिमय',
    ],
  },
  {
    locale: 'ta',
    from: ['நுண்ணுயிர் எதிர்ப்பிகள்', 'ப்ரோபயாடிக்ஸ்', 'நீர் மாற்றம்'],
    to: [
      'மீன்வள அலுவலர் அல்லது நீர்வாழ் விலங்கு சுகாதார ஆய்வகத்தை அணுகவும்',
      'ப்ரோபயாடிக்ஸ்',
      'நீர் மாற்றம்',
    ],
  },
  {
    locale: 'te',
    from: ['యాంటీబయాటిక్స్', 'ప్రోబయోటిక్స్', 'నీటి మార్పిడి'],
    to: [
      'మత్స్య అధికారిని లేదా జల జంతు ఆరోగ్య ప్రయోగశాలను సంప్రదించండి',
      'ప్రోబయోటిక్స్',
      'నీటి మార్పిడి',
    ],
  },
  {
    locale: 'bn',
    from: ['অ্যান্টিবায়োটিক', 'প্রোবায়োটিক', 'পানি বিনিময়'],
    to: [
      'মৎস্য কর্মকর্তা বা জলজ প্রাণী স্বাস্থ্য পরীক্ষাগারের পরামর্শ নিন',
      'প্রোবায়োটিক',
      'পানি বিনিময়',
    ],
  },
  {
    locale: 'or',
    from: ['ଆଣ୍ଟିବାୟୋଟିକ୍ସ', 'ପ୍ରୋବାୟୋଟିକ୍ସ', 'ଜଳ ବିନିମୟ'],
    to: [
      'ମତ୍ସ୍ୟ ଅଧିକାରୀ କିମ୍ବା ଜଳଜ ପ୍ରାଣୀ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷାଗାରର ପରାମର୍ଶ ନିଅନ୍ତୁ',
      'ପ୍ରୋବାୟୋଟିକ୍ସ',
      'ଜଳ ବିନିମୟ',
    ],
  },
];

/**
 * Spec 2026-09-19 disease/health D0:
 *  - S3: the library stops recommending "Antibiotics" for Vibriosis (EN + 5
 *    translations). Data only; idempotent (a second run matches no rows).
 *  - H5: disease_records.disease_id is NOT NULL, so its FK's ON DELETE SET
 *    NULL could only ever throw. Recreate it as ON DELETE RESTRICT (the API
 *    now answers 409 "in use"). The FK is found by column, not by name, in
 *    case production's constraint name differs from the baseline's.
 *
 * Apply to production BEFORE deploying the backend that ships with it.
 */
export class RemoveAntibioticAdvice1780701300000 implements MigrationInterface {
  name = 'RemoveAntibioticAdvice1780701300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rewrite(queryRunner, 'from', 'to');
    await this.setDiseaseFk(queryRunner, 'RESTRICT');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.setDiseaseFk(queryRunner, 'SET NULL');
    await this.rewrite(queryRunner, 'to', 'from');
  }

  private async rewrite(
    queryRunner: QueryRunner,
    oldKey: 'from' | 'to',
    newKey: 'from' | 'to',
  ): Promise<void> {
    for (const fix of VIBRIO_TREATMENT_FIX) {
      if (fix.locale === 'en') {
        await queryRunner.query(
          `UPDATE "disease_library"
              SET "treatment_recommendations" = $1::text[]
            WHERE "scientific_name" = $2
              AND "treatment_recommendations" = $3::text[]`,
          [fix[newKey], VIBRIO, fix[oldKey]],
        );
      } else {
        await queryRunner.query(
          `UPDATE "disease_library_translations" t
              SET "treatment_recommendations" = $1::text[]
             FROM "disease_library" d
            WHERE t."disease_id" = d."id"
              AND d."scientific_name" = $2
              AND t."locale" = $3
              AND t."treatment_recommendations" = $4::text[]`,
          [fix[newKey], VIBRIO, fix.locale, fix[oldKey]],
        );
      }
    }
  }

  private async setDiseaseFk(
    queryRunner: QueryRunner,
    onDelete: 'RESTRICT' | 'SET NULL',
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE c record;
      BEGIN
        FOR c IN
          SELECT con.conname
            FROM pg_constraint con
            JOIN pg_attribute a
              ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
           WHERE con.contype = 'f'
             AND con.conrelid = 'disease_records'::regclass
             AND con.confrelid = 'disease_library'::regclass
             AND a.attname = 'disease_id'
        LOOP
          EXECUTE format('ALTER TABLE "disease_records" DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "disease_records" ADD CONSTRAINT "FK_23db30d1ea638a4db231c4ed7f9"
         FOREIGN KEY ("disease_id") REFERENCES "disease_library"("id")
         ON DELETE ${onDelete} ON UPDATE NO ACTION`,
    );
  }
}
