import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('broodstocks')
export class Broodstock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  supplier: string;

  @Column({ type: 'text', nullable: true, name: 'line_code' })
  lineCode: string;

  @Column({ type: 'text', nullable: true })
  origin: string;

  @Column({ type: 'jsonb', nullable: true })
  specifications: object;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
