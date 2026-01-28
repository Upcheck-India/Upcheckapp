import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class DiseaseRecord extends BaseEntity {
    static table = 'disease_records';

    @text('crop_id') cropId!: string;
    @text('disease_id') diseaseId!: string;
    @text('recorded_date') recordedDate!: string;
    @text('severity_at_detection') severityAtDetection!: string;
    @text('notes') notes?: string;
}
