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

@Entity('chemical_data')
export class ChemicalData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'crop_id', type: 'uuid' })
  cropId: string;

  @ManyToOne(() => Crop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Column({ type: 'date', name: 'measurement_date' })
  measurementDate: Date;

  @Column({ type: 'time', name: 'measurement_time' })
  measurementTime: string;

  @Column({ type: 'numeric', nullable: true, name: 'ammonia_nh3_ppm' })
  ammoniaNh3Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'nitrite_no2_ppm' })
  nitriteNo2Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'alkalinity_ppm' })
  alkalinityPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'nitrate_no3_ppm' })
  nitrateNo3Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'hardness_ppm' })
  hardnessPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'calcium_ca_ppm' })
  calciumCaPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'magnesium_mg_ppm' })
  magnesiumMgPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'carbonate_co3_ppm' })
  carbonateCo3Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'bicarbonate_hco3_ppm' })
  bicarbonateHco3Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'tom_ppm' })
  tomPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'ammonium_nh4_ppm' })
  ammoniumNh4Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'phosphate_po4_ppm' })
  phosphatePo4Ppm: number;

  @Column({ type: 'numeric', nullable: true, name: 'total_ammonia_ppm' })
  totalAmmoniaPpm: number;

  @Column({ type: 'numeric', nullable: true, name: 'potassium_ppm' })
  potassiumPpm: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Audit: who created / last updated this record (member or owner).
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
