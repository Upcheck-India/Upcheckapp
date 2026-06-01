import { MigrationInterface, QueryRunner } from "typeorm";

export class DatabaseQualityFixes1740487200000 implements MigrationInterface {
    name = 'DatabaseQualityFixes1740487200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ============================================================
        // Phase 1: Add Indexes on FK and lookup columns
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_farms_user_id" ON "farms" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ponds_farm_id" ON "ponds" ("farm_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ponds_status" ON "ponds" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ponds_active_cycle_id" ON "ponds" ("active_cycle_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_pond_id" ON "crops" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_farm_id" ON "crops" ("farm_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_hatchery_id" ON "crops" ("hatchery_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_species_id" ON "crops" ("species_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_broodstock_id" ON "crops" ("broodstock_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crops_is_active" ON "crops" ("is_active")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_water_quality_records_pond_id" ON "water_quality_records" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_feed_records_pond_id" ON "feed_records" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_feed_records_crop_id" ON "feed_records" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_treatments_crop_id" ON "treatments" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_treatments_product_id" ON "treatments" ("product_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mortality_records_crop_id" ON "mortality_records" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chemical_data_crop_id" ON "chemical_data" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_plankton_data_crop_id" ON "plankton_data" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_microbiology_data_crop_id" ON "microbiology_data" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_disease_records_crop_id" ON "disease_records" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_disease_records_disease_id" ON "disease_records" ("disease_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_harvests_crop_id" ON "harvests" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sampling_data_pond_id" ON "sampling_data" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sampling_data_crop_id" ON "sampling_data" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_simulations_pond_id" ON "simulations" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_simulations_user_id" ON "simulations" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_expenses_pond_id" ON "expenses" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_expenses_crop_id" ON "expenses" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_expenses_user_id" ON "expenses" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_alerts_user_id" ON "alerts" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_alerts_pond_id" ON "alerts" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_alerts_farm_id" ON "alerts" ("farm_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_alerts_is_read" ON "alerts" ("is_read")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_farm_id" ON "inventory" ("farm_id")`);

        // ============================================================
        // Phase 2: Add missing FK constraints (only if they don't exist)
        // Using DO $$ blocks to check before adding
        // ============================================================

        // Farm → User
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "farms" ADD CONSTRAINT "FK_farms_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Crop → Hatchery
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "crops" ADD CONSTRAINT "FK_crops_hatchery_id" FOREIGN KEY ("hatchery_id") REFERENCES "hatcheries"("id") ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Crop → Species
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "crops" ADD CONSTRAINT "FK_crops_species_id" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Crop → Broodstock
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "crops" ADD CONSTRAINT "FK_crops_broodstock_id" FOREIGN KEY ("broodstock_id") REFERENCES "broodstocks"("id") ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Treatment → Product
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "treatments" ADD CONSTRAINT "FK_treatments_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Simulation → User
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "simulations" ADD CONSTRAINT "FK_simulations_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Expense → User
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Alert → User
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Alert → Pond
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_pond_id" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Alert → Farm
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_farm_id" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // ============================================================
        // Phase 3: Add missing updated_at columns
        // ============================================================
        await queryRunner.query(`ALTER TABLE "water_quality_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "feed_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "mortality_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "chemical_data" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "plankton_data" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "microbiology_data" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "disease_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "sampling_data" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "simulations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);

        // ============================================================
        // Phase 4: Fix type mismatches (Harvest & Expense timestamps)
        // ============================================================
        await queryRunner.query(`ALTER TABLE "harvests" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "harvests" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Phase 4: Revert type changes
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "harvests" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "harvests" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::TIMESTAMP`);

        // Phase 3: Remove added columns
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "simulations" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "sampling_data" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "disease_records" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "microbiology_data" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "plankton_data" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "chemical_data" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "mortality_records" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "treatments" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "feed_records" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "water_quality_records" DROP COLUMN IF EXISTS "updated_at"`);

        // Phase 2: Remove FK constraints
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_farm_id"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_pond_id"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_user_id"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "FK_expenses_user_id"`);
        await queryRunner.query(`ALTER TABLE "simulations" DROP CONSTRAINT IF EXISTS "FK_simulations_user_id"`);
        await queryRunner.query(`ALTER TABLE "treatments" DROP CONSTRAINT IF EXISTS "FK_treatments_product_id"`);
        await queryRunner.query(`ALTER TABLE "crops" DROP CONSTRAINT IF EXISTS "FK_crops_broodstock_id"`);
        await queryRunner.query(`ALTER TABLE "crops" DROP CONSTRAINT IF EXISTS "FK_crops_species_id"`);
        await queryRunner.query(`ALTER TABLE "crops" DROP CONSTRAINT IF EXISTS "FK_crops_hatchery_id"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP CONSTRAINT IF EXISTS "FK_farms_user_id"`);

        // Phase 1: Remove indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_farm_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_is_read"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_farm_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expenses_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expenses_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expenses_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_simulations_user_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_simulations_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sampling_data_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sampling_data_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_harvests_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disease_records_disease_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disease_records_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_microbiology_data_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_plankton_data_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chemical_data_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mortality_records_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_treatments_product_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_treatments_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_feed_records_crop_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_feed_records_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_water_quality_records_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_is_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_broodstock_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_species_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_hatchery_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_farm_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crops_pond_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ponds_active_cycle_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ponds_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ponds_farm_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_farms_user_id"`);
    }
}
