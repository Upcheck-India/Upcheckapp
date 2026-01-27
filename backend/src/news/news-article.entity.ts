import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('news_articles')
export class NewsArticle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    summary: string;

    @Column({ type: 'text', nullable: true })
    category: string;

    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ type: 'text', nullable: true })
    author: string;

    @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
    publishedAt: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
