import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedDiseaseLibrary1746000000000 implements MigrationInterface {
    name = 'SeedDiseaseLibrary1746000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF (SELECT COUNT(*) FROM "disease_library") = 0 THEN
                    INSERT INTO "disease_library" ("id", "name", "scientific_name", "common_names", "symptoms", "prevention_measures", "treatment_recommendations", "image_urls", "severity_level", "created_at") VALUES
                    (gen_random_uuid(), 'AHPND/EMS', 'Acute Hepatopancreatic Necrosis Disease', ARRAY['EMS','Early Mortality Syndrome'], ARRAY['Empty stomach','Pale hepatopancreas','Soft shells','Sluggish swimming'], ARRAY['Quarantine','Good water quality','Disinfection'], ARRAY['Probiotics','Water exchange','Lime application'], ARRAY[]::text[], 'high', now()),
                    (gen_random_uuid(), 'WSSV', 'White Spot Syndrome Virus', ARRAY['White Spot'], ARRAY['White inclusions on carapace','Reduced feeding','Mortality'], ARRAY['Biosecurity','Screening'], ARRAY['No cure','Cull infected ponds'], ARRAY[]::text[], 'high', now()),
                    (gen_random_uuid(), 'EHP', 'Enterocytozoon hepatopenaei', ARRAY['EHP'], ARRAY['Growth retardation','White feces syndrome','Reduced feed conversion'], ARRAY['Use SPF post-larvae','Biosecurity'], ARRAY['No effective treatment','Remove and disinfect'], ARRAY[]::text[], 'medium', now()),
                    (gen_random_uuid(), 'IMNV', 'Infectious Myonecrosis Virus', ARRAY['IMN'], ARRAY['Muscle necrosis','White necrotic lesions','High mortality'], ARRAY['SPF stocks','Biosecurity'], ARRAY['No cure','Cull'], ARRAY[]::text[], 'high', now()),
                    (gen_random_uuid(), 'Vibriosis', 'Vibrio spp.', ARRAY['Luminescent Vibriosis','Shell disease'], ARRAY['Luminescence','Necrotic lesions','Red discoloration'], ARRAY['Probiotics','Good water quality'], ARRAY['Antibiotics','Probiotics','Water exchange'], ARRAY[]::text[], 'medium', now()),
                    (gen_random_uuid(), 'Black Gill Disease', 'Various fungi/bacteria', ARRAY['Black gill'], ARRAY['Black gill filaments','Reduced respiration'], ARRAY['Good water quality'], ARRAY['Water exchange','Lime'], ARRAY[]::text[], 'low', now()),
                    (gen_random_uuid(), 'Running Mortality Syndrome', 'Running Mortality Syndrome', ARRAY['RMS'], ARRAY['Progressive mortality','Soft shells','Pale hepatopancreas'], ARRAY['Biosecurity','Quarantine'], ARRAY['Probiotics','Vitamins'], ARRAY[]::text[], 'high', now()),
                    (gen_random_uuid(), 'Shell Disease', 'Shell Disease', ARRAY['Brown spot'], ARRAY['Brown/black spots on shell','Shell erosion'], ARRAY['Good water quality','Avoid injury'], ARRAY['Lime application','Improve water quality'], ARRAY[]::text[], 'low', now()),
                    (gen_random_uuid(), 'Taura Syndrome Virus', 'Taura Syndrome Virus', ARRAY['TSV'], ARRAY['Cuticular epithelium lesions','Red tail'], ARRAY['SPF stocks','Biosecurity'], ARRAY['No cure','Cull'], ARRAY[]::text[], 'high', now()),
                    (gen_random_uuid(), 'Yellow Head Virus', 'Yellow Head Virus', ARRAY['YHV'], ARRAY['Yellow head','Reduced feeding','Mortality'], ARRAY['SPF stocks','Screening'], ARRAY['No cure','Cull'], ARRAY[]::text[], 'high', now());
                END IF;
            END $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "disease_library" WHERE "scientific_name" IN (
                'Acute Hepatopancreatic Necrosis Disease',
                'White Spot Syndrome Virus',
                'Enterocytozoon hepatopenaei',
                'Infectious Myonecrosis Virus',
                'Vibrio spp.',
                'Various fungi/bacteria',
                'Running Mortality Syndrome',
                'Shell Disease',
                'Taura Syndrome Virus',
                'Yellow Head Virus'
            )
        `);
    }
}
