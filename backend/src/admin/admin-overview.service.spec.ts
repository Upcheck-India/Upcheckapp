import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminOverviewService } from './admin-overview.service';
import { R2AnalyticsService } from '../storage/r2-analytics.service';

const undefinedTable = Object.assign(new Error('relation does not exist'), {
  code: '42P01',
});

describe('AdminOverviewService', () => {
  let service: AdminOverviewService;
  let query: jest.Mock;
  let bucketStats: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    bucketStats = jest.fn().mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOverviewService,
        { provide: DataSource, useValue: { query } },
        { provide: R2AnalyticsService, useValue: { bucketStats } },
      ],
    }).compile();
    service = module.get(AdminOverviewService);
  });

  it('aggregates every number from its own query', async () => {
    query
      .mockResolvedValueOnce([{ today: '1', last7d: '2', last30d: '3', total: '10' }]) // signups
      .mockResolvedValueOnce([{ total: '5', active: '3' }]) // farms
      .mockResolvedValueOnce([{ total: '9', active: '4' }]) // ponds
      .mockResolvedValueOnce([{ active: '2' }]) // cycles
      .mockResolvedValueOnce([{ open: '7' }]) // feedback
      .mockResolvedValueOnce([{ pending: '3', failed: '1' }]) // photo_deletions
      .mockResolvedValueOnce([{ date: '2026-09-20', count: 4 }]) // logsPerDay
      .mockResolvedValueOnce([{ exists: false }]); // photo_objects to_regclass

    const result = await service.get();

    expect(result.signups).toEqual({ today: 1, last7d: 2, last30d: 3, total: 10 });
    expect(result.farms).toEqual({ total: 5, active: 3 });
    expect(result.ponds).toEqual({ total: 9, active: 4 });
    expect(result.cycles).toEqual({ active: 2 });
    expect(result.feedback).toEqual({ open: 7 });
    expect(result.photoDeletions).toEqual({ pending: 3, failed: 1 });
    expect(result.logsPerDay).toEqual([{ date: '2026-09-20', count: 4 }]);
    expect(result.storage).toBeNull();
    expect(result.r2Bucket).toBeNull();
  });

  it('carries the R2 bucket stats through when Cloudflare analytics is configured', async () => {
    query
      .mockResolvedValueOnce([{ today: '0', last7d: '0', last30d: '0', total: '0' }])
      .mockResolvedValueOnce([{ total: '0', active: '0' }])
      .mockResolvedValueOnce([{ total: '0', active: '0' }])
      .mockResolvedValueOnce([{ active: '0' }])
      .mockResolvedValueOnce([{ open: '0' }])
      .mockResolvedValueOnce([{ pending: '0', failed: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ exists: false }]);
    bucketStats.mockResolvedValue({ objectCount: 84, totalBytes: 2000 });

    const result = await service.get();
    expect(result.r2Bucket).toEqual({ objectCount: 84, totalBytes: 2000 });
  });

  it('omits a number instead of failing the whole page when its table is missing', async () => {
    query
      .mockRejectedValueOnce(undefinedTable) // signups fails
      .mockResolvedValueOnce([{ total: '5', active: '3' }])
      .mockResolvedValueOnce([{ total: '9', active: '4' }])
      .mockResolvedValueOnce([{ active: '2' }])
      .mockResolvedValueOnce([{ open: '7' }])
      .mockResolvedValueOnce([{ pending: '0', failed: '0' }])
      .mockRejectedValueOnce(undefinedTable) // logsPerDay fails
      .mockResolvedValueOnce([{ exists: false }]);

    const result = await service.get();

    expect(result.signups).toBeNull();
    expect(result.logsPerDay).toEqual([]);
    expect(result.farms).toEqual({ total: 5, active: 3 });
  });

  it('reads storage totals once photo_objects exists', async () => {
    query
      .mockResolvedValueOnce([{ today: '0', last7d: '0', last30d: '0', total: '0' }])
      .mockResolvedValueOnce([{ total: '0', active: '0' }])
      .mockResolvedValueOnce([{ total: '0', active: '0' }])
      .mockResolvedValueOnce([{ active: '0' }])
      .mockResolvedValueOnce([{ open: '0' }])
      .mockResolvedValueOnce([{ pending: '0', failed: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ count: '42', bytes: '1000' }]);

    const result = await service.get();
    expect(result.storage).toEqual({ objectCount: 42, totalBytes: 1000 });
  });

  it('still rethrows a real database error rather than hiding it', async () => {
    query.mockRejectedValueOnce(new Error('connection reset'));
    await expect(service.get()).rejects.toThrow('connection reset');
  });
});
