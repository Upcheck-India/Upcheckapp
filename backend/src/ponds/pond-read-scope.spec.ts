/**
 * Reading a pond respects per-pond assignment, not just farm membership.
 *
 * Every WRITE path already went through `FarmAccessService.assertCanAccessPond`,
 * which checks `farm_member_ponds`. `PondsService.findOneAccessible` — the read
 * path behind pond context, the pond dashboard and the ownership guard — asked
 * only "are you on this farm". So a worker assigned ponds 1–3 could not write
 * to pond 7 but could read its biomass, DOC, feed totals and water-quality
 * history. Half a feature is worse than none, because the half that works
 * implies the other half does too.
 */
import { PondsService } from './ponds.service';
import { ForbiddenException } from '@nestjs/common';

const POND = { id: 'pond-7', farmId: 'farm-1', farm: { userId: 'owner-1' } };

const build = (assertCanAccessPond: jest.Mock) => {
  const service = Object.create(PondsService.prototype) as PondsService;
  Object.assign(service, {
    pondsRepository: { findOne: jest.fn().mockResolvedValue(POND) },
    farmsService: { verifyAccess: jest.fn() },
    farmAccess: { assertCanAccessPond },
  });
  return service;
};

describe('findOneAccessible — pond scope', () => {
  it('refuses a member who is scoped out of this pond', async () => {
    const assertCanAccessPond = jest
      .fn()
      .mockRejectedValue(new ForbiddenException('not your pond'));

    await expect(
      build(assertCanAccessPond).findOneAccessible('pond-7', 'worker-1', 'READ'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(assertCanAccessPond).toHaveBeenCalledWith('worker-1', 'pond-7', 'READ');
  });

  it('allows a member who is in scope', async () => {
    const assertCanAccessPond = jest.fn().mockResolvedValue(POND);

    await expect(
      build(assertCanAccessPond).findOneAccessible('pond-7', 'worker-1', 'READ'),
    ).resolves.toMatchObject({ id: 'pond-7' });
  });

  // The owner fast-path exists to save two queries on the hottest read in the
  // app. An owner is not scopable, so skipping the check is correct — but it
  // must stay a fast path and not become a hole for anyone else.
  it('skips the check entirely for the farm owner', async () => {
    const assertCanAccessPond = jest.fn();

    await build(assertCanAccessPond).findOneAccessible('pond-7', 'owner-1', 'READ');

    expect(assertCanAccessPond).not.toHaveBeenCalled();
  });
});

describe('findAllForUser (GET /ponds/mine) — pond scope (#217)', () => {
  const build = (accessiblePondIds: string[]) => {
    const qb: any = {};
    for (const m of ['innerJoin', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy']) qb[m] = jest.fn(() => qb);
    qb.getMany = jest.fn().mockResolvedValue([]);
    const service = Object.create(PondsService.prototype) as PondsService;
    Object.assign(service, {
      pondsRepository: { createQueryBuilder: jest.fn(() => qb) },
      farmAccess: {
        getAccessibleFarmIds: jest.fn().mockResolvedValue(['farm-1']),
        getAccessiblePondIdsForFarms: jest.fn().mockResolvedValue(accessiblePondIds),
      },
    });
    return { service, qb };
  };

  it('lists only the ponds a scoped worker was given, not the whole farm', async () => {
    const { service, qb } = build(['pond-1', 'pond-2']);
    await service.findAllForUser('worker-1');
    expect(qb.where).toHaveBeenCalledWith('pond.id IN (:...pondIds)', { pondIds: ['pond-1', 'pond-2'] });
  });

  it('returns nothing (and runs no pond query) when no pond is accessible', async () => {
    const { service, qb } = build([]);
    expect(await service.findAllForUser('worker-1')).toEqual([]);
    expect(qb.getMany).not.toHaveBeenCalled();
  });
});
