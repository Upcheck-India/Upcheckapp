export declare enum SimulationScenarioType {
    FeedChange = "feed_change",
    PriceChange = "price_change",
    StockingDensity = "stocking_density"
}
export declare class SimulationVariablesDto {
    feedPrice?: number;
    growthImprovement?: number;
    sellingPrice?: number;
    stockingDensity?: number;
}
export declare class RunSimulationDto {
    pondId: string;
    scenarioType: SimulationScenarioType;
    variables: SimulationVariablesDto;
}
