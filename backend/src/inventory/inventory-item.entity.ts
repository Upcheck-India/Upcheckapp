import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Farm } from '../farms/farm.entity';

@Entity('inventory')
export class InventoryItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text' })
    category: string; // feed, chemical, equipment, medicine

    @Column({ type: 'numeric', default: 0 })
    quantity: number;

    @Column({ type: 'text', nullable: true })
    unit: string;

    @Column({ name: 'unit_price', type: 'numeric', nullable: true })
    unitPrice: number;

    @Column({ name: 'reorder_level', type: 'numeric', nullable: true })
    reorderLevel: number;

    @Column({ type: 'text', nullable: true })
    supplier: string;

    @Column({ name: 'expiry_date', type: 'timestamp with time zone', nullable: true })
    expiryDate: Date;
}
