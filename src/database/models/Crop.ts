import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class Crop extends BaseEntity {
    static table = 'crops';

    @text('name') name!: string;
    @text('pond_id') pondId!: string;
    @text('status') status!: string;
    @date('start_date') startDate!: number;
    @date('end_date') endDate?: number;
}
