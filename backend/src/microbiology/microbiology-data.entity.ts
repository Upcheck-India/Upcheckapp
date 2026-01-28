import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('microbiology_data')
export class MicrobiologyData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ type: 'date', name: 'measurement_date' })
    measurementDate: Date;

    @Column({ type: 'numeric', nullable: true, name: 'total_bacillus_cfu_ml' })
    totalBacillusCfuMl: number;

    @Column({ type: 'numeric', nullable: true, name: 'total_vibrio_count_tvc_cfu_ml' })
    totalVibrioCountTvcCfuMl: number;

    @Column({ type: 'numeric', nullable: true, name: 'yellow_vibrio_count_tvc_cfu_ml' })
    yellowVibrioCountTvcCfuMl: number;

    @Column({ type: 'numeric', nullable: true, name: 'green_vibrio_count_tvc_cfu_ml' })
    greenVibrioCountTvcCfuMl: number;

    @Column({ type: 'numeric', nullable: true, name: 'luminescent_bacteria_lb_cfu_ml' })
    luminescentBacteriaLbCfuMl: number;

    @Column({ type: 'text', nullable: true, name: 'note' })
    note: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
