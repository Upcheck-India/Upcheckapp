import { SimulationsService } from './simulations.service';
import { SimulationScenarioType } from './dto/run-simulation.dto';

/**
 * Guards the baseline/simulated same-cost-basis fix: a FeedChange scenario with
 * 0% growth changes nothing real, so profitDifference must be ~0. The old code
 * added projected feed cost only to the simulated side, yielding
 * profitDifference = -totalFeedCost.
 */
function makeService(opts: {
  biomass: number;
  feedUsed: number;
  expense: number;
  income: number;
}) {
  const qb = (value: any) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: value,
  });

  const feedRepository = {
    createQueryBuilder: jest.fn(() =>
      qb(jest.fn().mockResolvedValue({ totalFeed: opts.feedUsed })),
    ),
  };
  // Code queries expenses first, then income.
  const txGetRawOne = jest
    .fn()
    .mockResolvedValueOnce({ total: opts.expense })
    .mockResolvedValueOnce({ total: opts.income });
  const transactionsRepository = {
    createQueryBuilder: jest.fn(() => qb(txGetRawOne)),
  };
  const pondsRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'pond-1',
      farmId: 'farm-1',
      farm: { userId: 'user-1' },
    }),
  };
  const cropsRepository = {
    findOne: jest.fn().mockResolvedValue({
      harvestWeightKg: opts.biomass,
      stockingDensity: 30,
      status: 'active',
    }),
  };
  const simulationsRepository = {
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => ({ ...x, id: 'sim-1' })),
  };

  const svc = new SimulationsService(
    simulationsRepository as any,
    cropsRepository as any,
    feedRepository as any,
    transactionsRepository as any,
    pondsRepository as any,
  );
  return svc;
}

describe('SimulationsService.runSimulation — same cost basis', () => {
  it('a 0%-growth FeedChange yields ~0 profit difference (feed not double-counted)', async () => {
    const svc = makeService({
      biomass: 1000,
      feedUsed: 1500,
      expense: 50000,
      income: 300000,
    });

    const { result } = await svc.runSimulation(
      {
        pondId: 'pond-1',
        scenarioType: SimulationScenarioType.FeedChange,
        variables: { feedPrice: 60, growthImprovement: 0 },
      } as any,
      'user-1',
    );

    expect(result.baselineNetProfit).toBe(250000); // 300000 − 50000
    expect(result.profitDifference).toBeCloseTo(0, 6);
    expect(result.simulatedNetProfit).toBeCloseTo(250000, 6);
  });
});
