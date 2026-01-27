import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text' })
    category: string;

    @Column({ type: 'numeric' })
    price: number;

    @Column({ name: 'sale_price', type: 'numeric', nullable: true })
    salePrice: number;

    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ type: 'integer', default: 0 })
    stock: number;

    @Column({ type: 'text', nullable: true })
    sku: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
