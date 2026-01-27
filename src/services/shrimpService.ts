export interface ShrimpInputs {
    pondArea: number; // m2
    stockingCount: number; // heads
    netDiameter: number; // m
    numberOfDrags: number;
    sampleWeightKg: number; // kg
    sampleCount: number; // heads
    totalFeedKg: number; // kg (accumulated)
}

export interface ShrimpResults {
    averageBodyWeight: number; // g
    estimatedBiomass: number; // kg
    survivalRate: number; // %
    fcr: number; // ratio
    estimatedCount: number; // heads
}

export const ShrimpService = {
    calculateStatistics(inputs: ShrimpInputs): ShrimpResults {
        // 1. Calculate Average Body Weight (ABW)
        // ABW = (Sample Weight * 1000) / Sample Count
        const abw = (inputs.sampleWeightKg * 1000) / inputs.sampleCount;

        // 2. Calculate Effective Drag Area
        // Formula approx: Area = Drag Length * Diameter? 
        // PRD mentions "Times drag a net". Commonly: Area = Distance * Diameter.
        // Assuming a standard drag distance or circle area if cast net?
        // Let's assume Drag Net covers a specific area. 
        // Formula for circular cast net: Pi * r^2. Diameter input implies circular.
        const radius = inputs.netDiameter / 2;
        const netArea = Math.PI * radius * radius;

        const totalSampledArea = netArea * inputs.numberOfDrags;

        // 3. Estimate Total Population (Survival Count)
        // Density = Sample Count / Total Sampled Area
        // Total Count = Density * Pond Area
        const density = inputs.sampleCount / totalSampledArea;
        const estimatedCount = density * inputs.pondArea;

        // 4. Survival Rate
        let survivalRate = (estimatedCount / inputs.stockingCount) * 100;
        if (survivalRate > 100) survivalRate = 100; // Cap at 100 if sampling error

        // 5. Estimated Biomass (Yield)
        // Biomass (kg) = (Estimated Count * ABW) / 1000
        const estimatedBiomass = (estimatedCount * abw) / 1000;

        // 6. FCR
        // FCR = Total Feed / Biomass Gain
        // For simplicity, assuming Biomass Gain ~= Current Biomass (ignoring stocking weight which is negligible)
        const fcr = inputs.totalFeedKg / estimatedBiomass;

        return {
            averageBodyWeight: parseFloat(abw.toFixed(2)),
            estimatedBiomass: parseFloat(estimatedBiomass.toFixed(2)),
            survivalRate: parseFloat(survivalRate.toFixed(2)),
            fcr: parseFloat(fcr.toFixed(2)),
            estimatedCount: Math.round(estimatedCount)
        };
    }
};
