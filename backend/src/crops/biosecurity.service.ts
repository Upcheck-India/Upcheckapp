import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CropsService } from './crops.service';
import { isMissingSchema } from '../health-observations/health.constants';
import { toIstDateString } from '../common/ist-date';

/**
 * Seed PCR + biosecurity checklist (spec 2026-09-19 disease/health D5).
 * The app mirrors these in `frontend/src/api/biosecurity.ts`.
 */
export const BIOSECURITY_ITEMS = [
  { key: 'pond_dried', stage: 'prep' },
  { key: 'bottom_limed', stage: 'prep' },
  { key: 'water_filtered', stage: 'prep' },
  { key: 'water_disinfected', stage: 'prep' },
  { key: 'bird_net', stage: 'prep' },
  { key: 'crab_fence', stage: 'prep' },
  { key: 'footbath', stage: 'culture' },
  { key: 'separate_tools', stage: 'culture' },
  { key: 'dead_shrimp_disposal', stage: 'culture' },
] as const;
export const BIOSECURITY_KEYS = BIOSECURITY_ITEMS.map((i) => i.key);

export const PCR_TESTS = ['wssv', 'ehp', 'ahpnd', 'ihhnv'] as const;
export const PCR_RESULTS = ['negative', 'positive', 'not_tested'] as const;
export type PcrResult = (typeof PCR_RESULTS)[number];
export type PcrResults = Partial<Record<(typeof PCR_TESTS)[number], PcrResult>>;

export interface SeedHealth {
  plSpf: boolean | null;
  plPcrDate: string | null;
  plPcrLab: string | null;
  plPcrResults: PcrResults | null;
}

export interface CropBiosecurity {
  cropId: string;
  /** false until migration 1780701600000 is applied: the app hides the UI. */
  available: boolean;
  seed: SeedHealth | null;
  items: {
    key: string;
    stage: 'prep' | 'culture';
    done: boolean;
    doneOn: string | null;
    note: string | null;
  }[];
  done: number;
  total: number;
}

/** Unknown test keys or result values → 400; only known keys are kept. */
export function parsePcrResults(v: unknown): PcrResults | null {
  if (v == null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) {
    throw new BadRequestException('plPcrResults must be an object');
  }
  const out: PcrResults = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (!(PCR_TESTS as readonly string[]).includes(k)) {
      throw new BadRequestException(`Unknown PCR test: ${k}`);
    }
    if (!(PCR_RESULTS as readonly string[]).includes(r as string)) {
      throw new BadRequestException(`Invalid PCR result for ${k}`);
    }
    out[k as (typeof PCR_TESTS)[number]] = r as PcrResult;
  }
  return out;
}

const notMigrated = () =>
  new ServiceUnavailableException(
    'Seed health and biosecurity are not available yet (migration 1780701600000 not applied)',
  );

@Injectable()
export class BiosecurityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly crops: CropsService,
  ) {}

  /**
   * Seed PCR + checklist for one crop. NO access check — for H3/D4/D7
   * callers that already cleared the crop. Before the migration it returns
   * `available: false` with an empty checklist instead of throwing.
   */
  async read(cropId: string): Promise<CropBiosecurity> {
    const q = (sql: string) => this.dataSource.query(sql, [cropId]);
    let available = true;
    const missing = (err: any) => {
      if (!isMissingSchema(err)) throw err;
      available = false;
      return [];
    };
    const [seedRows, checkRows] = await Promise.all([
      q(
        `SELECT pl_spf AS "plSpf", to_char(pl_pcr_date, 'YYYY-MM-DD') AS "plPcrDate",
                pl_pcr_lab AS "plPcrLab", pl_pcr_results AS "plPcrResults"
           FROM crops WHERE id = $1`,
      ).catch(missing),
      q(
        `SELECT item_key AS "key", to_char(done_on, 'YYYY-MM-DD') AS "doneOn", note
           FROM biosecurity_checks WHERE crop_id = $1`,
      ).catch(missing),
    ]);
    const byKey = new Map<string, any>(checkRows.map((r: any) => [r.key, r]));
    const items = BIOSECURITY_ITEMS.map((d) => {
      const r = byKey.get(d.key);
      return {
        key: d.key,
        stage: d.stage,
        done: !!r,
        doneOn: r?.doneOn ?? null,
        note: r?.note ?? null,
      };
    });
    return {
      cropId,
      available,
      seed: available ? (seedRows[0] ?? null) : null,
      items,
      done: items.filter((i) => i.done).length,
      total: items.length,
    };
  }

  async forCrop(cropId: string, userId: string): Promise<CropBiosecurity> {
    await this.crops.findOneAccessible(cropId, userId, 'READ');
    return this.read(cropId);
  }

  /**
   * Edit seed health (a crop edit → WRITE_MANAGEMENT, same as PATCH /crops/:id).
   * `undefined` leaves a field as is; `null` clears it.
   */
  async setSeed(
    cropId: string,
    userId: string,
    body: Partial<SeedHealth>,
  ): Promise<CropBiosecurity> {
    await this.crops.findOneAccessible(cropId, userId, 'WRITE_MANAGEMENT');
    const cols: [string, unknown][] = [];
    if (body.plSpf !== undefined) cols.push(['pl_spf', body.plSpf]);
    if (body.plPcrDate !== undefined) cols.push(['pl_pcr_date', body.plPcrDate]);
    if (body.plPcrLab !== undefined) cols.push(['pl_pcr_lab', body.plPcrLab?.trim() || null]);
    if (body.plPcrResults !== undefined) {
      const r = parsePcrResults(body.plPcrResults);
      cols.push(['pl_pcr_results', r ? JSON.stringify(r) : null]);
    }
    if (cols.length) {
      const set = cols.map(([c], i) => `${c} = $${i + 2}`).join(', ');
      await this.dataSource
        .query(`UPDATE crops SET ${set} WHERE id = $1`, [cropId, ...cols.map(([, v]) => v)])
        .catch((err) => {
          throw isMissingSchema(err) ? notMigrated() : err;
        });
    }
    return this.read(cropId);
  }

  /**
   * Tick / un-tick one item (WRITE_OPERATIONAL). Idempotent: a replay hits
   * UNIQUE(crop_id, item_key) or the client id and is ignored. A tick on a
   * closed cycle is 409, which the offline queue treats as done.
   */
  async setCheck(
    cropId: string,
    userId: string,
    body: { id?: string; itemKey: string; done: boolean; doneOn?: string; note?: string },
    now = new Date(),
  ): Promise<CropBiosecurity> {
    const crop = await this.crops.findOneAccessible(cropId, userId, 'WRITE_OPERATIONAL');
    if (!(BIOSECURITY_KEYS as string[]).includes(body.itemKey)) {
      throw new BadRequestException('Unknown biosecurity item');
    }
    if (crop.status === 'completed') {
      throw new ConflictException({
        statusCode: 409,
        code: 'CYCLE_CLOSED',
        message: 'This cycle is already closed.',
      });
    }
    const write = body.done
      ? this.dataSource.query(
          `INSERT INTO biosecurity_checks (id, crop_id, item_key, done_on, done_by, note)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            body.id ?? null,
            cropId,
            body.itemKey,
            body.doneOn ?? toIstDateString(now),
            userId,
            body.note?.trim() || null,
          ],
        )
      : this.dataSource.query(
          `DELETE FROM biosecurity_checks WHERE crop_id = $1 AND item_key = $2`,
          [cropId, body.itemKey],
        );
    await write.catch((err) => {
      throw isMissingSchema(err) ? notMigrated() : err;
    });
    return this.read(cropId);
  }
}
