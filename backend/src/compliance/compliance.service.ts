import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertsService } from '../alerts/alerts.service';
import { PushService } from '../push/push.service';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';
import { BannedSubstanceFlag } from '../banned-substances/banned-substance-matcher';
import { evaluateRecord, FlagHistoryEntry } from './compliance-eval';
import { COMPLIANCE_ALERT_EN, COMPLIANCE_PUSH, fill } from './compliance-push.i18n';

/** 42P01 undefined_table / 42703 undefined_column — not-yet-migrated schema. */
function isMissingSchema(err: any): boolean {
  const code = err?.code ?? err?.driverError?.code;
  return code === '42P01' || code === '42703';
}

const USER_NAME_SQL = `coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.username)`;

/** "2026-09-19" → "19/09/2026" (the Indian day-first order; no month names to localise). */
const dayFirst = (d: string) => String(d).slice(0, 10).split('-').reverse().join('/');

export type ComplianceStatus = 'none_logged' | 'restricted_logged' | 'banned_logged';

export interface ComplianceItem {
  date: string;
  source: 'treatment' | 'disease';
  recordId: string;
  substances: string[];
  flag: Exclude<BannedSubstanceFlag, 'none'>;
}

export interface CycleCompliance {
  status: ComplianceStatus;
  items: ComplianceItem[];
  listVersion: string;
  evaluatedAt: string;
}

export interface EscalationRecord {
  id: string;
  cropId: string;
  date: string;
  flag: BannedSubstanceFlag;
  matches: string[];
}

/**
 * Banned-substance escalation + cycle antimicrobial status (disease spec D3).
 *
 * Never blocks a save: `escalate` is best-effort and swallows its own errors.
 */
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly alerts: AlertsService,
    private readonly push: PushService,
  ) {}

  private q(sql: string, params: unknown[]): Promise<any[]> {
    return this.dataSource.query(sql, params);
  }

  /**
   * Tell every owner and manager of the farm, except whoever logged it.
   * banned → alert (critical) + push; restricted → alert (watch) only.
   * Idempotent per (record, flag): a replay or a re-save never re-notifies.
   */
  async escalate(
    rec: EscalationRecord,
    kind: 'treatment' | 'disease',
    loggerId?: string | null,
  ): Promise<void> {
    if (rec.flag === 'none') return;
    try {
      const seen = await this.q(
        `SELECT 1 FROM alerts WHERE type = 'compliance' AND data->>'recordId' = $1 AND data->>'flag' = $2 LIMIT 1`,
        [rec.id, rec.flag],
      );
      if (seen.length) return;

      const [ctx] = await this.q(
        `SELECT p.id AS "pondId", coalesce(nullif(p.display_name, ''), p.name) AS "pondName",
                f.id AS "farmId", f.user_id AS "ownerId"
           FROM crops c JOIN ponds p ON p.id = c.pond_id JOIN farms f ON f.id = p.farm_id
          WHERE c.id = $1`,
        [rec.cropId],
      );
      if (!ctx) return;

      const managers = await this.q(
        `SELECT user_id AS "userId" FROM farm_members
          WHERE farm_id = $1 AND role = 'manager' AND status = 'active'`,
        [ctx.farmId],
      ).catch((err) => {
        if (isMissingSchema(err)) return [];
        throw err;
      });
      const recipients = [
        ...new Set<string>([ctx.ownerId, ...managers.map((m: any) => m.userId)]),
      ].filter((id) => id && id !== loggerId);
      if (!recipients.length) return;

      const [who] = loggerId
        ? await this.q(`SELECT ${USER_NAME_SQL} AS name FROM users u WHERE u.id = $1`, [loggerId])
        : [];
      const langs = await this.q(
        `SELECT id, language_preference AS lang FROM profiles WHERE id = ANY($1::uuid[])`,
        [recipients],
      ).catch(() => [] as any[]);
      const langOf = new Map<string, string>(langs.map((l: any) => [l.id, l.lang]));

      const params = {
        pond: ctx.pondName ?? '',
        substances: rec.matches.join(', '),
        name: who?.name ?? '',
        date: dayFirst(rec.date),
      };
      const banned = rec.flag === 'banned';
      const t = banned ? 'banned' : 'restricted';

      for (const userId of recipients) {
        await this.alerts.create({
          userId,
          farmId: ctx.farmId,
          pondId: ctx.pondId,
          type: 'compliance',
          severity: banned ? 'critical' : 'warning',
          title: fill(COMPLIANCE_ALERT_EN[`${t}Title`], params),
          message: fill(COMPLIANCE_ALERT_EN[`${t}Body`], params),
          data: {
            source: 'compliance',
            steps: [],
            status: 'open',
            recordId: rec.id,
            recordKind: kind,
            flag: rec.flag,
            titleKey: { key: `compliance.alert.${t}Title`, params },
            bodyKey: { key: `compliance.alert.${t}Body`, params },
          },
        } as any);
        if (banned) {
          const text = COMPLIANCE_PUSH[langOf.get(userId) ?? 'en'] ?? COMPLIANCE_PUSH.en;
          await this.push.sendToUser(userId, {
            title: text.title,
            body: fill(text.body, params),
            data: { type: 'compliance', recordId: rec.id, pondId: ctx.pondId },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Compliance escalation failed for ${kind} ${rec.id}: ${err?.message ?? err}`,
      );
    }
  }

  /**
   * GET /crops/:id/compliance — computed on read against the CURRENT list,
   * never trusted from stored flags (D3.4). A stored flag that differs is
   * refreshed with a `by: 'system'` history entry, so a newly banned
   * substance is caught in old cycles without a migration job.
   */
  async cycleCompliance(cropId: string): Promise<CycleCompliance> {
    const treatments = await this.q(
      `SELECT id, treatment_date::text AS date, description, notes, product_name AS "productName",
              ingredient_keys AS "ingredientKeys", banned_substance_flag AS flag,
              banned_substance_matches AS matches
         FROM treatments WHERE crop_id = $1`,
      [cropId],
    ).catch((err) => {
      if (!isMissingSchema(err)) throw err;
      // Pre-D2 schema: no structured columns yet — text only.
      return this.q(
        `SELECT id, treatment_date::text AS date, description, notes,
                banned_substance_flag AS flag, banned_substance_matches AS matches
           FROM treatments WHERE crop_id = $1`,
        [cropId],
      );
    });
    const diseases = await this.q(
      `SELECT id, recorded_date::text AS date, notes,
              banned_substance_flag AS flag, banned_substance_matches AS matches
         FROM disease_records WHERE crop_id = $1`,
      [cropId],
    );

    const items: ComplianceItem[] = [];
    const walk = async (
      rows: any[],
      source: ComplianceItem['source'],
      table: 'treatments' | 'disease_records',
    ) => {
      for (const r of rows) {
        const ev = evaluateRecord(r);
        const stored: string[] = r.matches ?? [];
        const differs =
          ev.flag !== (r.flag ?? 'none') ||
          ev.matches.length !== stored.length ||
          ev.matches.some((m) => !stored.includes(m));
        if (differs) await this.refresh(table, r, ev.flag, ev.matches);
        if (ev.flag !== 'none') {
          items.push({
            date: String(r.date).slice(0, 10),
            source,
            recordId: r.id,
            substances: ev.matches,
            flag: ev.flag,
          });
        }
      }
    };
    await walk(treatments, 'treatment', 'treatments');
    await walk(diseases, 'disease', 'disease_records');

    items.sort((a, b) => a.date.localeCompare(b.date));
    const status: ComplianceStatus = items.some((i) => i.flag === 'banned')
      ? 'banned_logged'
      : items.length
        ? 'restricted_logged'
        : 'none_logged';
    return {
      status,
      items,
      listVersion: BANNED_LIST_VERSION,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /** Best-effort: a failed refresh must not fail the read. */
  private async refresh(
    table: 'treatments' | 'disease_records',
    r: any,
    flag: BannedSubstanceFlag,
    matches: string[],
  ) {
    const entry: FlagHistoryEntry = {
      at: new Date().toISOString(),
      by: 'system',
      from: r.flag ?? 'none',
      to: flag,
      matches,
      listVersion: BANNED_LIST_VERSION,
    };
    const base = `UPDATE ${table} SET banned_substance_flag = $2, banned_substance_matches = $3,
                  banned_substance_list_version = $4`;
    try {
      await this.q(
        `${base}, flag_history = coalesce(flag_history, '[]'::jsonb) || $5::jsonb WHERE id = $1`,
        [r.id, flag, matches, BANNED_LIST_VERSION, JSON.stringify([entry])],
      ).catch((err) => {
        if (!isMissingSchema(err)) throw err;
        return this.q(`${base} WHERE id = $1`, [r.id, flag, matches, BANNED_LIST_VERSION]);
      });
    } catch (err: any) {
      this.logger.warn(`Could not refresh the flag on ${table} ${r.id}: ${err?.message ?? err}`);
    }
  }
}
