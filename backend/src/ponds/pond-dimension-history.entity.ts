import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pond } from './pond.entity';

@Entity('pond_dimension_history')
export class PondDimensionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId: string;

  @Column({ name: 'length_m_before', type: 'numeric', nullable: true })
  lengthMBefore: number;

  @Column({ name: 'width_m_before', type: 'numeric', nullable: true })
  widthMBefore: number;

  @Column({ name: 'diameter_m_before', type: 'numeric', nullable: true })
  diameterMBefore: number;

  @Column({ name: 'depth_m_before', type: 'numeric', nullable: true })
  depthMBefore: number;

  @Column({
    name: 'calculated_area_m2_before',
    type: 'numeric',
    nullable: true,
  })
  calculatedAreaM2Before: number;

  @Column({ name: 'override_area_m2_before', type: 'numeric', nullable: true })
  overrideAreaM2Before: number;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamp with time zone' })
  changedAt: Date;

  @Column({
    name: 'change_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  changeReason: string;
}
