import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PondsService } from '../ponds/ponds.service';
import { InventoryService } from '../inventory/inventory.service';
import { FeedRecordsService } from '../feed-records/feed-records.service';
import { HarvestsService } from '../harvests/harvests.service';
import { ExpensesService } from '../finances/expenses.service';

describe('ReportsService', () => {
    let service: ReportsService;
    let pondsService: PondsService;
    let inventoryService: InventoryService;
    let feedRecordsService: FeedRecordsService;

    const mockPondsService = {
        findAll: jest.fn(),
    };

    const mockInventoryService = {
        getLowStock: jest.fn(),
    };

    const mockFeedRecordsService = {
        getDailyFeedUsage: jest.fn(),
    };

    const mockHarvestsService = {};
    const mockExpensesService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: PondsService, useValue: mockPondsService },
                { provide: InventoryService, useValue: mockInventoryService },
                { provide: FeedRecordsService, useValue: mockFeedRecordsService },
                { provide: HarvestsService, useValue: mockHarvestsService },
                { provide: ExpensesService, useValue: mockExpensesService },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
        pondsService = module.get<PondsService>(PondsService);
        inventoryService = module.get<InventoryService>(InventoryService);
        feedRecordsService = module.get<FeedRecordsService>(FeedRecordsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getDashboardSummary', () => {
        it('should return aggregated data', async () => {
            // Mock findAll response
            const mockPonds = [
                { id: '1', activeCycleId: 'cycle1' },
                { id: '2', activeCycleId: null },
            ];
            mockPondsService.findAll.mockResolvedValue({ ponds: mockPonds, total: 2 });

            // Mock low stock
            mockInventoryService.getLowStock.mockResolvedValue([{ id: 'inv1' }]);

            // Mock daily feed
            mockFeedRecordsService.getDailyFeedUsage.mockResolvedValue(55.5);

            const result = await service.getDashboardSummary('user1', 'farm1');

            expect(result).toEqual({
                activePondsCount: 1,
                totalPondsCount: 2,
                lowStockAlerts: 1,
                todayFeedUsage: 55.5,
            });

            expect(pondsService.findAll).toHaveBeenCalledWith('farm1', 'user1');
            expect(inventoryService.getLowStock).toHaveBeenCalledWith('farm1');
            expect(feedRecordsService.getDailyFeedUsage).toHaveBeenCalledWith('farm1', expect.any(Date));
        });

        it('should return zeros if farmId is missing', async () => {
            const result = await service.getDashboardSummary('user1', undefined);
            expect(result).toEqual({
                activePondsCount: 0,
                totalPondsCount: 0,
                lowStockAlerts: 0,
                todayFeedUsage: 0,
            });
        });
    });
});
