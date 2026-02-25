import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Pond } from '../ponds/pond.entity';
import { Crop } from '../crops/crop.entity';
import { InventoryItem } from '../inventory/inventory-item.entity';

@Entity('feed_records')
export class FeedRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'pond_id', type: 'uuid' })
    pondId: string;

    @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pond_id' })
    pond: Pond;

    @Index()
    @Column({ name: 'crop_id', type: 'uuid', nullable: true })
    cropId: string | null;

    @ManyToOne(() => Crop, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'crop_id' })
    crop: Crop;

    @Column({ name: 'inventory_item_id', type: 'uuid', nullable: true })
    inventoryItemId: string | null;

    @ManyToOne(() => InventoryItem, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'inventory_item_id' })
    inventoryItem: InventoryItem;

    @CreateDateColumn({ name: 'recorded_at', type: 'timestamp with time zone' })
    recordedAt: Date;

    @Column({ name: 'feed_type', type: 'text' })
    feedType: string;

    @Column({ name: 'feed_brand', type: 'text', nullable: true })
    feedBrand: string;

    @Column({ name: 'quantity_kg', type: 'numeric' })
    quantityKg: number;

    @Column({ name: 'feeding_time', type: 'text', nullable: true })
    feedingTime: string; // morning, afternoon, evening, night

    @Column({ name: 'feeding_method', type: 'text', nullable: true })
    feedingMethod: string; // manual, automatic, broadcast

    @Column({ name: 'water_temperature', type: 'numeric', nullable: true })
    waterTemperature: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
