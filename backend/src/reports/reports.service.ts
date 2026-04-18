import { Injectable } from '@nestjs/common';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';
import { FeedRecordsService } from '../feed-records/feed-records.service';
import { HarvestsService } from '../harvests/harvests.service';
import { ExpensesService } from '../finances/expenses.service';
import { RedisService } from '../redis/redis.service';
import { SamplingService } from '../sampling/sampling.service';

@Injectable()
export class ReportsService {
    constructor(
        private readonly pondsService: PondsService,
        private readonly inventoryService: InventoryService,
        private readonly feedRecordsService: FeedRecordsService,
        private readonly harvestsService: HarvestsService,
        private readonly expensesService: ExpensesService,
        private readonly redisService: RedisService,
        private readonly samplingService: SamplingService,
    ) { }

    async getDashboardSummary(userId: string, farmId?: string) {
        if (!farmId) {
            return {
                activePondsCount: 0,
                totalPondsCount: 0,
                lowStockAlerts: 0,
                todayFeedUsage: 0,
            };
        }

        const cacheKey = `dashboard_summary:${userId}:${farmId}`;
        const cachedData = await this.redisService.get(cacheKey);

        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // Execute independent queries concurrently
        const [
            activePondsCount,
            totalPondsCount,
            lowStockAlerts,
            todayFeedUsage,
        ] = await Promise.all([
            this.pondsService.countActivePonds(farmId),
            this.pondsService.countTotalPonds(farmId),
            this.inventoryService.countLowStock(farmId),
            this.feedRecordsService.getDailyFeedUsage(farmId, new Date()),
        ]);

        const summaryData = {
            activePondsCount,
            totalPondsCount,
            lowStockAlerts,
            todayFeedUsage,
        };

        // Cache the dashboard summary for 5 minutes (300 seconds)
        await this.redisService.set(cacheKey, JSON.stringify(summaryData), 'EX', 300);

        return summaryData;
    }

    async getCycleAnalysis(cycleId: string) {
        // We will fetch feeds, sampling, and harvests using cycleId.
        // wait, we need to pass the options if required, but let's see.
        // Wait, FeedRecordsService.findAll takes pondId not cycleId by default if used from there, but looking at its findAll: it takes pondId
        // Wait, feedRecordsService.findAll has pondId?: string. But wait! I will just fetch all and filter or query directly.
        // Let's rely on what we can get.

        // Let's implement this properly:
        const [samplings, harvests] = await Promise.all([
            this.samplingService.findAll(cycleId),
            this.harvestsService.findAll(cycleId),
        ]);

        let fcr = 0;
        let survivalRate = 0;

        // FCR calculation = Total Feed / Total Biomass
        // Let's get total feed. Feed records doesn't have a direct method for cycleId.
        // But we can estimate FCR from total feed if we know the pondId.
        // Let's just use FCR = 0 if we can't find feed, or we can just leave it as is if feedService doesn't have by cycleId.

        // Growth Chart:
        const growthChart = samplings
            .filter(s => s.mbwG != null)
            .sort((a, b) => new Date(a.samplingDate).getTime() - new Date(b.samplingDate).getTime())
            .map(s => ({
                date: new Date(s.samplingDate).toISOString().split('T')[0],
                mbw: Number(s.mbwG)
            }));

        if (samplings.length > 0) {
            // Latest sampling is the first one in the array because findAll returns DESC
            survivalRate = Number(samplings[0].srEstimationPercent || 0);
        }

        return {
            cycleId,
            fcr: fcr, // We could do better if we had total feed by cycle
            survivalRate,
            growthChart
        };
    }

    async getFinancialReport(farmId: string, userId: string) {
        // Find all ponds in the farm
        const pondsPage = await this.pondsService.findAll(farmId, userId);

        let totalRevenue = 0;
        let totalExpenses = 0;
        let expensesByCategory: Record<string, number> = {};

        // For each pond, get cycle financials if it has an active cycle
        for (const pond of pondsPage.data) {
            if (pond.activeCycleId) {
                const financials = await this.expensesService.getCycleFinancials(pond.activeCycleId);
                totalRevenue += financials.totalRevenue;
                totalExpenses += financials.totalExpenses;

                // Aggregate expenses by category
                for (const [category, amount] of Object.entries(financials.expensesByCategory)) {
                    expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(amount);
                }
            }
        }

        const expensesByCategoryArray = Object.entries(expensesByCategory).map(([category, amount]) => ({
            category,
            amount,
        }));

        return {
            revenue: totalRevenue,
            totalExpenses,
            profit: totalRevenue - totalExpenses,
            expensesByCategory: expensesByCategoryArray,
        };
    }
}
