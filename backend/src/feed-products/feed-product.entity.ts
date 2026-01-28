import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('feed_products')
export class FeedProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    brand: string;

    @Column({ type: 'text' })
    code: string; // e.g., "Beryl 2A"

    @Column({ type: 'text', nullable: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    type: string; // pellet, powder, etc.

    @Column({ type: 'text', nullable: true, name: 'size_range_mm' })
    sizeRangeMm: string;

    @Column({ type: 'numeric', nullable: true, name: 'protein_percent' })
    proteinPercent: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
