import { Injectable } from '@nestjs/common';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';
import { FeedRecordsService } from '../feed-records/feed-records.service';
import { HarvestsService } from '../harvests/harvests.service';
import { ExpensesService } from '../finances/expenses.service';

@Injectable()
export class ReportsService {
    constructor(
        private readonly pondsService: PondsService,
        private readonly inventoryService: InventoryService,
        private readonly feedRecordsService: FeedRecordsService,
        private readonly harvestsService: HarvestsService,
        private readonly expensesService: ExpensesService,
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

        // 1. Active Ponds
        // Handle paginated response structure { ponds, total, ... }
        const result = await this.pondsService.findAll(farmId, userId);
        const ponds = result.ponds || [];
        const activePonds = ponds.filter(p => p.activeCycleId);

        // 2. Low Stock Alerts
        const lowStockItems = await this.inventoryService.getLowStock(farmId);

        // 3. Feed Usage Today
        const todayFeedUsage = await this.feedRecordsService.getDailyFeedUsage(farmId, new Date());

        return {
            activePondsCount: activePonds.length,
            totalPondsCount: ponds.length,
            lowStockAlerts: lowStockItems.length,
            todayFeedUsage,
        };
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
