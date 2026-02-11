import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class ChemicalData extends BaseEntity {
    static table = 'chemical_data';

    @text('crop_id') cropId!: string;
    @text('measurement_date') measurementDate!: string;
    @text('measurement_time') measurementTime!: string;
    @field('ammonia_nh3_ppm') ammoniaNh3Ppm?: number;
    @field('nitrite_no2_ppm') nitriteNo2Ppm?: number;
    @field('alkalinity_ppm') alkalinityPpm?: number;
    @field('ph') ph?: number;
    @field('temperature_c') temperatureC?: number;
}
