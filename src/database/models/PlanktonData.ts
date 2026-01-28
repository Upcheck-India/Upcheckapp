import { field, text, date } from '@nozbe/watermelondb/decorators';
import { BaseEntity } from './BaseEntity';

export default class PlanktonData extends BaseEntity {
    static table = 'plankton_data';

    @text('crop_id') cropId!: string;
    @text('measurement_date') measurementDate!: string;
    @text('measurement_time') measurementTime!: string;
    @field('green_algae_ga_cell_ml') greenAlgaeGaCellMl?: number;
    @field('blue_green_algae_bga_cell_ml') blueGreenAlgaeBgaCellMl?: number;
    @field('diatom_cell_ml') diatomCellMl?: number;
}
