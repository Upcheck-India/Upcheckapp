import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BiosecurityService, BIOSECURITY_ITEMS, parsePcrResults } from './biosecurity.service';
import { roleSatisfies } from '../farm-access/farm-capability';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BiosecurityCheckDto } from './biosecurity.controller';

const missing = (code: string) => Object.assign(new Error('schema'), { code });

describe('BiosecurityService (D5)', () => {
  let query: jest.Mock;
  let crops: { findOneAccessible: jest.Mock };
  let service: BiosecurityService;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    crops = { findOneAccessible: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }) };
    service = new BiosecurityService({ query } as any, crops as any);
  });

  describe('read', () => {
    it('counts progress over the nine items', async () => {
      query.mockImplementation(async (sql: string) =>
        sql.includes('biosecurity_checks')
          ? ['pond_dried', 'bottom_limed', 'water_filtered', 'bird_net', 'footbath'].map((key) => ({
              key,
              doneOn: '2026-09-01',
              note: null,
            }))
          : [{ plSpf: true, plPcrDate: null, plPcrLab: null, plPcrResults: { wssv: 'negative' } }],
      );
      const r = await service.read('c1');
      expect(r).toMatchObject({ available: true, done: 5, total: 9 });
      expect(r.items.find((i) => i.key === 'pond_dried')).toMatchObject({ done: true, doneOn: '2026-09-01' });
      expect(r.items.find((i) => i.key === 'crab_fence')!.done).toBe(false);
      expect(r.seed).toMatchObject({ plSpf: true, plPcrResults: { wssv: 'negative' } });
    });

    it.each(['42P01', '42703'])('degrades before the migration (%s) instead of throwing', async (code) => {
      query.mockRejectedValue(missing(code));
      const r = await service.read('c1');
      expect(r).toMatchObject({ available: false, seed: null, done: 0, total: BIOSECURITY_ITEMS.length });
    });

    it('rethrows other DB errors', async () => {
      query.mockRejectedValue(missing('08006'));
      await expect(service.read('c1')).rejects.toThrow('schema');
    });
  });

  describe('setCheck', () => {
    const tick = { id: '11111111-1111-4111-8111-111111111111', itemKey: 'bird_net', done: true };

    it('inserts idempotently on the client id / (crop, item) key — a replay is ignored', async () => {
      await service.setCheck('c1', 'u1', tick, new Date('2026-09-19T20:00:00Z'));
      await service.setCheck('c1', 'u1', tick, new Date('2026-09-19T20:00:00Z'));
      const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT'));
      expect(inserts).toHaveLength(2);
      for (const [sql, params] of inserts) {
        expect(sql).toMatch(/ON CONFLICT DO NOTHING/);
        // client id kept; IST day (20:00Z = next day in IST)
        expect(params).toEqual([tick.id, 'c1', 'bird_net', '2026-09-20', 'u1', null]);
      }
    });

    it('un-tick deletes by (crop, item)', async () => {
      await service.setCheck('c1', 'u1', { itemKey: 'bird_net', done: false });
      expect(query.mock.calls[0][0]).toMatch(/DELETE FROM biosecurity_checks/);
      expect(query.mock.calls[0][1]).toEqual(['c1', 'bird_net']);
    });

    it('needs WRITE_OPERATIONAL and writes nothing when refused', async () => {
      crops.findOneAccessible.mockRejectedValue(new ForbiddenException());
      await expect(service.setCheck('c1', 'viewer', tick)).rejects.toBeInstanceOf(ForbiddenException);
      expect(crops.findOneAccessible).toHaveBeenCalledWith('c1', 'viewer', 'WRITE_OPERATIONAL');
      expect(query).not.toHaveBeenCalled();
    });

    it('a viewer does not hold WRITE_OPERATIONAL; a worker does', () => {
      expect(roleSatisfies('viewer', 'WRITE_OPERATIONAL')).toBe(false);
      expect(roleSatisfies('worker', 'WRITE_OPERATIONAL')).toBe(true);
    });

    it('409 on a closed cycle (the offline queue treats it as done)', async () => {
      crops.findOneAccessible.mockResolvedValue({ id: 'c1', status: 'completed' });
      await expect(service.setCheck('c1', 'u1', tick)).rejects.toBeInstanceOf(ConflictException);
      expect(query).not.toHaveBeenCalled();
    });

    it('rejects an unknown item', async () => {
      await expect(service.setCheck('c1', 'u1', { ...tick, itemKey: 'nope' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('503 before the migration', async () => {
      query.mockRejectedValue(missing('42P01'));
      await expect(service.setCheck('c1', 'u1', tick)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('DTO keeps the client id and validates the item key', async () => {
      const ok = plainToInstance(BiosecurityCheckDto, tick);
      expect(await validate(ok, { whitelist: true })).toHaveLength(0);
      expect(ok.id).toBe(tick.id);
      const bad = plainToInstance(BiosecurityCheckDto, { ...tick, itemKey: 'x' });
      expect(await validate(bad)).not.toHaveLength(0);
    });
  });

  describe('setSeed', () => {
    it('needs WRITE_MANAGEMENT and updates only the fields sent', async () => {
      await service.setSeed('c1', 'u1', {
        plSpf: true,
        plPcrLab: '  RGCA  ',
        plPcrResults: { wssv: 'negative', ehp: 'not_tested' },
      });
      expect(crops.findOneAccessible).toHaveBeenCalledWith('c1', 'u1', 'WRITE_MANAGEMENT');
      const [sql, params] = query.mock.calls[0];
      expect(sql).toBe('UPDATE crops SET pl_spf = $2, pl_pcr_lab = $3, pl_pcr_results = $4 WHERE id = $1');
      expect(params).toEqual(['c1', true, 'RGCA', JSON.stringify({ wssv: 'negative', ehp: 'not_tested' })]);
    });

    it('null clears a field (an edit later from CycleDetail)', async () => {
      await service.setSeed('c1', 'u1', { plPcrDate: null, plPcrResults: null });
      expect(query.mock.calls[0][1]).toEqual(['c1', null, null]);
    });

    it('rejects an unknown test or result', async () => {
      await expect(
        service.setSeed('c1', 'u1', { plPcrResults: { wssv: 'maybe' } as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(() => parsePcrResults({ tsv: 'negative' })).toThrow(BadRequestException);
      expect(query).not.toHaveBeenCalled();
    });

    it('503 before the migration', async () => {
      query.mockRejectedValue(missing('42703'));
      await expect(service.setSeed('c1', 'u1', { plSpf: false })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
