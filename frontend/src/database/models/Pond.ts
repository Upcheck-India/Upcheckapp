import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class Pond extends BaseEntity {
    static table = 'ponds';

    @text('name') name!: string;
    @text('farm_id') farmId!: string;
    @field('size') size?: number;
    @field('width') width?: number;
    @field('length') length?: number;
    @field('depth') depth?: number;
}
