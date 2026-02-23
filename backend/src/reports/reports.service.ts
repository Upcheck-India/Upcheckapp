import { Injectable } from '@nestjs/common';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';
import { FeedRecordsService } from '../feed-records/feed-records.service';
import { HarvestsService } from '../harvests/harvests.service';
import { ExpensesService } from '../finances/expenses.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ReportsService {
    constructor(
        private readonly pondsService: PondsService,
        private readonly inventoryService: InventoryService,
        private readonly feedRecordsService: FeedRecordsService,
        private readonly harvestsService: HarvestsService,
        private readonly expensesService: ExpensesService,
        private readonly redisService: RedisService,
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
        // Placeholder implementation for now
        return {
            cycleId,
            fcr: 1.2,
            survivalRate: 85,
            growthChart: [
                { date: '2023-10-01', mbw: 2.5 },
                { date: '2023-10-08', mbw: 4.8 },
                { date: '2023-10-15', mbw: 7.2 },
            ]
        };
    }

    async getFinancialReport(farmId: string) {
        // Placeholder implementation
        return {
            revenue: 50000,
            totalExpenses: 35000,
            profit: 15000,
            expensesByCategory: [
                { category: 'Feed', amount: 20000 },
                { category: 'Labor', amount: 8000 },
                { category: 'Energy', amount: 5000 },
                { category: 'Other', amount: 2000 },
            ]
        };
    }
}
