import { HarvestPlansService } from './harvest-plans.service';
import { CreateHarvestPlanDto } from './dto/create-harvest-plan.dto';
import { UpdateHarvestPlanDto } from './dto/update-harvest-plan.dto';
export declare class HarvestPlansController {
    private readonly harvestPlansService;
    constructor(harvestPlansService: HarvestPlansService);
    create(createDto: CreateHarvestPlanDto): Promise<import("./harvest-plan.entity").HarvestPlan>;
    findAll(pondId?: string): Promise<import("./harvest-plan.entity").HarvestPlan[]>;
    findOne(id: string): Promise<import("./harvest-plan.entity").HarvestPlan | null>;
    update(id: string, updateDto: UpdateHarvestPlanDto): Promise<import("./harvest-plan.entity").HarvestPlan | null>;
    complete(id: string, payload: {
        actualHarvestDate: Date;
        actualWeightKg: number;
        actualPricePerKg: number;
        farmId: string;
        cropId?: string;
    }): Promise<import("./harvest-plan.entity").HarvestPlan | null>;
    getSummary(pondId: string, farmId: string): Promise<{
        pondId: string;
        totalRevenue: number;
        totalExpense: number;
        netProfit: number;
        latestPlan: import("./harvest-plan.entity").HarvestPlan | null;
    }>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
