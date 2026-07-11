import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { Product } from '../products/product.entity';

@Entity('treatments')
export class Treatment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Column({ type: 'date', name: 'treatment_date' })
  treatmentDate: Date;

  @Column({ type: 'text', nullable: true, name: 'based_on' })
  basedOn: string; // 'written_notes' | 'product_usage'

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'numeric', nullable: true, name: 'dosage_kg' })
  dosageKg: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;

  // Server-evaluated at write time (BANNED-1) — never trust a client-sent
  // value for these; TreatmentsService recomputes them from description+notes
  // on every create/update against the backend's own BANNED_SUBSTANCES list.
  @Column({
    name: 'banned_substance_flag',
    type: 'text',
    default: 'none',
  })
  bannedSubstanceFlag: 'none' | 'restricted' | 'banned';

  @Column({
    name: 'banned_substance_matches',
    type: 'text',
    array: true,
    default: [],
  })
  bannedSubstanceMatches: string[];

  @Column({
    name: 'banned_substance_list_version',
    type: 'text',
    nullable: true,
  })
  bannedSubstanceListVersion: string | null;
}
