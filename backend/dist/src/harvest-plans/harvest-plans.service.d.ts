import { Repository } from 'typeorm';
import { HarvestPlan } from './harvest-plan.entity';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
import { Transaction } from '../transactions/transaction.entity';
import { Crop } from '../crops/crop.entity';
export declare class HarvestPlansService {
    private plansRepository;
    private transactionsRepository;
    private cropsRepository;
    constructor(plansRepository: Repository<HarvestPlan>, transactionsRepository: Repository<Transaction>, cropsRepository: Repository<Crop>);
    create(createDto: CreateHarvestPlanDto): Promise<HarvestPlan>;
    findAll(pondId?: string): Promise<HarvestPlan[]>;
    findOne(id: string): Promise<HarvestPlan | null>;
    update(id: string, updateDto: UpdateHarvestPlanDto): Promise<HarvestPlan | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    completePlan(id: string, payload: {
        actualHarvestDate: Date;
        actualWeightKg: number;
        actualPricePerKg: number;
        farmId: string;
        cropId?: string;
    }): Promise<HarvestPlan | null>;
    getCycleSummary(pondId: string, farmId: string): Promise<{
        pondId: string;
        totalRevenue: number;
        totalExpense: number;
        netProfit: number;
        latestPlan: HarvestPlan | null;
    }>;
}
