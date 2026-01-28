import { Repository } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { FeedRecord } from '../feed-records/feed-record.entity';
import { Pond } from '../ponds/pond.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Simulation } from './simulation.entity';
import { RunSimulationDto } from './dto/run-simulation.dto';
export interface SimulationResult {
    baselineNetProfit: number;
    simulatedNetProfit: number;
    profitDifference: number;
    projectedBiomass: number;
    projectedFcr: number;
    totalRevenue: number;
    totalCost: number;
    riskWarning?: string;
}
export declare class SimulationsService {
    private simulationsRepository;
    private cropsRepository;
    private feedRepository;
    private transactionsRepository;
    private pondsRepository;
    constructor(simulationsRepository: Repository<Simulation>, cropsRepository: Repository<Crop>, feedRepository: Repository<FeedRecord>, transactionsRepository: Repository<Transaction>, pondsRepository: Repository<Pond>);
    runSimulation(dto: RunSimulationDto, userId: string): Promise<{
        simulation: Simulation;
        result: SimulationResult;
    }>;
}
