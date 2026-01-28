import { Pond } from '../ponds/pond.entity';
export declare class HarvestPlan {
    id: string;
    pondId: string;
    pond: Pond;
    cropId: string;
    plannedHarvestDate: Date;
    targetWeightKg: number;
    expectedPricePerKg: number;
    expectedRevenue: number;
    actualHarvestDate: Date;
    actualWeightKg: number;
    actualPricePerKg: number;
    actualRevenue: number;
    notes: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
