import { Pond } from '../ponds/pond.entity';
export declare class Simulation {
    id: string;
    userId: string;
    pondId: string;
    pond: Pond;
    scenarioType: string;
    inputFeedPrice: number;
    inputGrowthRate: number;
    inputSellingPrice: number;
    inputStockingDensity: number;
    resultProjectedBiomass: number;
    resultProjectedFcr: number;
    resultTotalRevenue: number;
    resultTotalCost: number;
    resultNetProfit: number;
    resultProfitDiff: number;
    createdAt: Date;
}
