import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('plankton_data')
export class PlanktonData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ type: 'date', name: 'measurement_date' })
    measurementDate: Date;

    @Column({ type: 'time', name: 'measurement_time' })
    measurementTime: string;

    @Column({ type: 'bigint', nullable: true, name: 'green_algae_ga_cell_ml' })
    greenAlgaeGaCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'blue_green_algae_bga_cell_ml' })
    blueGreenAlgaeBgaCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'dinoflagellata_cell_ml' })
    dinoflagellataCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'diatom_cell_ml' })
    diatomCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'protozoa_cell_ml' })
    protozoaCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'floc_cell_ml' })
    flocCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'golden_brown_algae_cell_ml' })
    goldenBrownAlgaeCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'euglenophyta_cell_ml' })
    euglenophytaCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'zoo_cell_ml' })
    zooCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'haptoyphyta_cell_ml' })
    haptoyphytaCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'golden_green_algae_cell_ml' })
    goldenGreenAlgaeCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'yellow_green_algae_cell_ml' })
    yellowGreenAlgaeCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'other_plankton_cell_ml' })
    otherPlanktonCellMl: number;

    @Column({ type: 'bigint', nullable: true, name: 'total_plankton_cell_ml' })
    totalPlanktonCellMl: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
