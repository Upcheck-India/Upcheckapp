import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class MortalityRecord extends BaseEntity {
    static table = 'mortality_records';

    @text('crop_id') cropId!: string;
    @text('mortality_date') mortalityDate!: string;
    @text('based_on') basedOn!: string;
    @field('total_quantity') totalQuantity?: number;
    @field('total_weight_kg') totalWeightKg?: number;
}
