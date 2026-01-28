import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class MicrobiologyData extends BaseEntity {
    static table = 'microbiology_data';

    @text('crop_id') cropId!: string;
    @text('measurement_date') measurementDate!: string;
    @text('measurement_time') measurementTime!: string;
    @field('yellow_vibrio_cfu_ml') yellowVibrioCfuMl?: number;
    @field('green_vibrio_cfu_ml') greenVibrioCfuMl?: number;
}
