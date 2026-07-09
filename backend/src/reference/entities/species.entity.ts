import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('species')
export class Species {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'scientific_name' })
  scientificName: string;

  @Column({ type: 'text', nullable: true, name: 'common_name' })
  commonName: string;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_ph_min' })
  optimalPhMin: number;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_ph_max' })
  optimalPhMax: number;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_salinity_min' })
  optimalSalinityMin: number;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_salinity_max' })
  optimalSalinityMax: number;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_temp_min' })
  optimalTempMin: number;

  @Column({ type: 'numeric', nullable: true, name: 'optimal_temp_max' })
  optimalTempMax: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
