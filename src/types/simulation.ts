export type SimulationScenarioType = 'feed_change' | 'price_change' | 'stocking_density';

export interface SimulationVariables {
    feedPrice?: number;
    growthImprovement?: number;
    sellingPrice?: number;
    stockingDensity?: number;
}
