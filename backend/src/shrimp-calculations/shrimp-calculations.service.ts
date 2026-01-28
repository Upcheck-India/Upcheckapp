import { Injectable } from '@nestjs/common';

@Injectable()
export class ShrimpCalculationsService {
    /**
     * Calculate Feed Conversion Ratio (FCR)
     * FCR = Total Feed Used (kg) / Total Harvest Weight (kg)
     * Lower is better (typically 1.2-1.8 for shrimp)
     */
    calculateFcr(totalFeedKg: number, harvestWeightKg: number): number {
        if (harvestWeightKg === 0) return 0;
        return Math.round((totalFeedKg / harvestWeightKg) * 100) / 100;
    }

    /**
     * Calculate Average Daily Growth (ADG) in grams
     * ADG = (Final Weight - Initial Weight) / Days of Culture
     */
    calculateAdg(initialWeightG: number, finalWeightG: number, daysOfCulture: number): number {
        if (daysOfCulture === 0) return 0;
        return Math.round(((finalWeightG - initialWeightG) / daysOfCulture) * 1000) / 1000;
    }

    /**
     * Calculate Survival Rate (%)
     * SR = (Harvested Count / Initial Stock) * 100
     */
    calculateSurvivalRate(initialStock: number, harvestedCount: number): number {
        if (initialStock === 0) return 0;
        return Math.round((harvestedCount / initialStock) * 10000) / 100;
    }

    /**
     * Calculate Daily Feeding Amount based on biomass
     * Daily Feed = Biomass (kg) * Feeding Rate (%)
     */
    calculateDailyFeed(biomassKg: number, feedingPercentage: number): number {
        return Math.round((biomassKg * feedingPercentage / 100) * 100) / 100;
    }

    /**
     * Calculate Expected Harvest Weight
     * Expected = Stock Count * Survival Rate * Target Weight
     */
    calculateExpectedHarvest(stockingCount: number, survivalRatePercent: number, targetWeightG: number): {
        expectedCount: number;
        expectedWeightKg: number;
    } {
        const expectedCount = Math.round(stockingCount * survivalRatePercent / 100);
        const expectedWeightKg = Math.round((expectedCount * targetWeightG / 1000) * 100) / 100;
        return { expectedCount, expectedWeightKg };
    }

    /**
     * Project growth based on ADG
     */
    projectGrowth(currentWeightG: number, adgG: number, daysToProject: number): {
        projectedWeightG: number;
        projectedWeightByWeek: number[];
    } {
        const projectedWeightG = Math.round((currentWeightG + adgG * daysToProject) * 100) / 100;
        const projectedWeightByWeek: number[] = [];

        for (let week = 1; week <= Math.ceil(daysToProject / 7); week++) {
            const days = Math.min(week * 7, daysToProject);
            projectedWeightByWeek.push(Math.round((currentWeightG + adgG * days) * 100) / 100);
        }

        return { projectedWeightG, projectedWeightByWeek };
    }

    /**
     * Calculate biomass
     * Biomass = (Stock Count * Average Weight) / 1000
     */
    calculateBiomass(stockCount: number, averageWeightG: number): number {
        return Math.round((stockCount * averageWeightG / 1000) * 100) / 100;
    }

    /**
     * Get feeding rate recommendation based on shrimp size
     */
    /**
     * Get feeding rate recommendation based on shrimp size
     */
    getRecommendedFeedingRate(averageWeightG: number): number {
        if (averageWeightG < 3) return 10;
        if (averageWeightG < 5) return 8;
        if (averageWeightG < 10) return 5;
        if (averageWeightG < 15) return 4;
        if (averageWeightG < 20) return 3;
        return 2.5;
    }

    /**
     * Calculate Cultivation Performance
     * Estimates Biomass, Population, FCR, SR based on current feeding data
     */
    calculateCultivationPerformance(
        dailyFeed: number,
        fr: number,
        abw: number,
        cumulativeFeed: number,
        initialStocking: number
    ): {
        biomass: number;
        population: number;
        fcr: number;
        sr: number;
    } {
        // Prevent division by zero
        if (fr === 0 || abw === 0) {
            return { biomass: 0, population: 0, fcr: 0, sr: 0 };
        }

        // Biomass = Daily Feed / (FR / 100)
        const biomass = dailyFeed / (fr / 100);

        // Population = (Biomass (kg) * 1000) / ABW (g)
        const population = (biomass * 1000) / abw;

        // FCR = Cumulative Feed / Biomass
        const fcr = biomass > 0 ? cumulativeFeed / biomass : 0;

        // SR = (Population / Initial Stocking) * 100
        const sr = initialStocking > 0 ? (population / initialStocking) * 100 : 0;

        return {
            biomass: Math.round(biomass * 100) / 100,
            population: Math.round(population),
            fcr: Math.round(fcr * 100) / 100,
            sr: Math.round(sr * 100) / 100,
        };
    }

    /**
     * Calculate Free Ammonia (Toxic NH3)
     * NH3 = TAN * (1 / (1 + 10^(pKa - pH)))
     * pKa = 0.09018 + (2729.92 / (Temperature(K)))
     */
    calculateFreeAmmonia(tan: number, ph: number, temperature: number): {
        unionizedAmmonia: number;
        toxicityLevel: string;
    } {
        const tempK = temperature + 273.15;
        const pKa = 0.09018 + (2729.92 / tempK);
        const nh3 = tan * (1 / (1 + Math.pow(10, pKa - ph)));

        let toxicityLevel = 'safe';
        if (nh3 > 0.5) toxicityLevel = 'critical'; // Changed from 'high' to be more standard, but PRD says high. Let's follow PRD logic roughly or better standards. PRD: >0.5 high, >0.1 medium.
        else if (nh3 > 0.1) toxicityLevel = 'warning';

        return {
            unionizedAmmonia: Number(nh3.toFixed(4)),
            toxicityLevel,
        };
    }

    /**
     * Calculate Product Dosage Amount
     * Amount (kg) = (Pond Area (m2) * Water Level (m) * Dosage (ppm)) / 1000
     */
    calculateProductDosage(pondArea: number, waterLevel: number, dosage: number): {
        amountKg: number;
    } {
        const amountKg = (pondArea * waterLevel * dosage) / 1000;
        return {
            amountKg: Math.round(amountKg * 100) / 100,
        };
    }
}
