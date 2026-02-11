import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'farms',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'location', type: 'string', isOptional: true },
                { name: 'size', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'ponds',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'farm_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'size', type: 'number', isOptional: true },
                { name: 'width', type: 'number', isOptional: true },
                { name: 'length', type: 'number', isOptional: true },
                { name: 'depth', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'crops',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'pond_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'status', type: 'string' },
                { name: 'start_date', type: 'number' },
                { name: 'end_date', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        // Data Tracking Tables
        tableSchema({
            name: 'chemical_data',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'crop_id', type: 'string', isIndexed: true },
                { name: 'measurement_date', type: 'string' }, // YYYY-MM-DD
                { name: 'measurement_time', type: 'string' },
                { name: 'ammonia_nh3_ppm', type: 'number', isOptional: true },
                { name: 'nitrite_no2_ppm', type: 'number', isOptional: true },
                { name: 'alkalinity_ppm', type: 'number', isOptional: true },
                { name: 'ph', type: 'number', isOptional: true },
                { name: 'temperature_c', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'plankton_data',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'crop_id', type: 'string', isIndexed: true },
                { name: 'measurement_date', type: 'string' },
                { name: 'measurement_time', type: 'string' },
                { name: 'green_algae_ga_cell_ml', type: 'number', isOptional: true },
                { name: 'blue_green_algae_bga_cell_ml', type: 'number', isOptional: true },
                { name: 'diatom_cell_ml', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'microbiology_data',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'crop_id', type: 'string', isIndexed: true },
                { name: 'measurement_date', type: 'string' },
                { name: 'measurement_time', type: 'string' },
                { name: 'yellow_vibrio_cfu_ml', type: 'number', isOptional: true },
                { name: 'green_vibrio_cfu_ml', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'mortality_records',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'crop_id', type: 'string', isIndexed: true },
                { name: 'mortality_date', type: 'string' },
                { name: 'based_on', type: 'string' },
                { name: 'total_quantity', type: 'number', isOptional: true },
                { name: 'total_weight_kg', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'disease_records',
            columns: [
                { name: 'remote_id', type: 'string', isIndexed: true },
                { name: 'crop_id', type: 'string', isIndexed: true },
                { name: 'disease_id', type: 'string' },
                { name: 'recorded_date', type: 'string' },
                { name: 'severity_at_detection', type: 'string' },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
