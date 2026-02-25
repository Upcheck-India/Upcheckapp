import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Crop } from '../crops/crop.entity';

@Entity('harvests')
export class Harvest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'crop_id', type: 'uuid' })
    cropId: string;

    @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ type: 'date', name: 'harvest_date' })
    harvestDate: Date;

    @Column({ type: 'float', name: 'weight_kg' })
    weightKg: number;

    @Column({ type: 'int', nullable: true })
    count: number | null;

    @Column({ type: 'float', name: 'average_size', nullable: true })
    averageSize: number | null; // ABW/Size count per kg

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'sale_price_total', nullable: true })
    salePriceTotal: number | null;

    @Column({ type: 'varchar', name: 'buyer_name', nullable: true })
    buyerName: string | null;

    @Column({ type: 'enum', enum: ['partial', 'full'], name: 'harvest_type', default: 'partial' })
    harvestType: 'partial' | 'full';

    @Column({ type: 'enum', enum: ['pending', 'sold', 'discarded'], default: 'sold' })
    status: 'pending' | 'sold' | 'discarded';

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
