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
import { Pond } from '../ponds/pond.entity';
import { User } from '../auth/user.entity';

@Entity('simulations')
export class Simulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'pond_id', type: 'uuid' })
  pondId: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond: Pond;

  @Column({ name: 'scenario_type', type: 'text' })
  scenarioType: string;

  @Column({ name: 'input_feed_price', type: 'numeric', nullable: true })
  inputFeedPrice: number;

  @Column({ name: 'input_growth_rate', type: 'numeric', nullable: true })
  inputGrowthRate: number;

  @Column({ name: 'input_selling_price', type: 'numeric', nullable: true })
  inputSellingPrice: number;

  @Column({ name: 'input_stocking_density', type: 'numeric', nullable: true })
  inputStockingDensity: number;

  @Column({ name: 'result_projected_biomass', type: 'numeric', nullable: true })
  resultProjectedBiomass: number;

  @Column({ name: 'result_projected_fcr', type: 'numeric', nullable: true })
  resultProjectedFcr: number;

  @Column({ name: 'result_total_revenue', type: 'numeric', nullable: true })
  resultTotalRevenue: number;

  @Column({ name: 'result_total_cost', type: 'numeric', nullable: true })
  resultTotalCost: number;

  @Column({ name: 'result_net_profit', type: 'numeric', nullable: true })
  resultNetProfit: number;

  @Column({ name: 'result_profit_diff', type: 'numeric', nullable: true })
  resultProfitDiff: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
