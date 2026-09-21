import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertsService } from '../alerts/alerts.service';
import { PushService } from '../push/push.service';
import { isMissingSchema } from '../health-observations/health.constants';
import type { DiseaseName } from '../disease-warning/disease-warning.service';

/** One push per (pond, disease) per this window. */
export const DISEASE_PUSH_EVERY_MS = 3 * 24 * 3_600_000;

/** Short names farmers and labs use; the app localises the full name. */
const SHORT: Record<DiseaseName, string> = {
  WSSV: 'WSSV', AHPND: 'AHPND/EMS', EHP: 'EHP', WFD: 'WFD',
  Luminous: 'Luminous vibriosis', RMS: 'RMS', LSS: 'LSS',
};

/**
 * Push text in the RECIPIENT's language (the OS renders a push, so it is final
 * here). Native review pending, same as D3's compliance push.
 */
export const DISEASE_PUSH: Record<string, { title: string; body: string }> = {
  en: { title: '{pond}: {disease} risk is high', body: 'Check the pond today. Open Disease risk to see why and what to do.' },
  hi: { title: '{pond}: {disease} का खतरा ज़्यादा है', body: 'आज तालाब की जाँच करें। कारण और उपाय देखने के लिए रोग जोखिम खोलें।' },
  te: { title: '{pond}: {disease} ప్రమాదం ఎక్కువగా ఉంది', body: 'ఈరోజే చెరువును పరిశీలించండి. కారణం, చేయాల్సింది చూడటానికి వ్యాధి ప్రమాదం తెరవండి.' },
  ta: { title: '{pond}: {disease} அபாயம் அதிகம்', body: 'இன்றே குளத்தை சரிபார்க்கவும். காரணமும் செய்ய வேண்டியதும் அறிய நோய் அபாயத்தைத் திறக்கவும்.' },
  bn: { title: '{pond}: {disease} ঝুঁকি বেশি', body: 'আজই পুকুর পরীক্ষা করুন। কারণ ও করণীয় দেখতে রোগের ঝুঁকি খুলুন।' },
  or: { title: '{pond}: {disease} ବିପଦ ଅଧିକ', body: 'ଆଜି ପୋଖରୀ ଯାଞ୍ଚ କରନ୍ତୁ। କାରଣ ଓ କରଣୀୟ ଦେଖିବାକୁ ରୋଗ ବିପଦ ଖୋଲନ୍ତୁ।' },
};

/**
 * C5.2: the push notification itself must not carry the pond name or disease
 * name — those land on a lock screen. `DISEASE_PUSH` above stays as the
 * (English, detailed) alert-center row text for after the tap.
 */
export const DISEASE_PUSH_TITLE: Record<string, string> = {
  en: 'Disease risk alert',
  hi: 'रोग जोखिम चेतावनी',
  te: 'వ్యాధి ప్రమాద హెచ్చరిక',
  ta: 'நோய் அபாய எச்சரிக்கை',
  bn: 'রোগের ঝুঁকি সতর্কতা',
  or: 'ରୋଗ ବିପଦ ସତର୍କତା',
};

const fill = (tpl: string, p: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '');

export interface CriticalDisease {
  pondId: string;
  disease: DiseaseName;
}

/**
 * D7: a Critical disease band pushes owners + managers, once per (pond,
 * disease) per 3 days. Dedup reuses the `alerts` table the alert center
 * already persists (type 'disease', data.disease) — no new table. The row is
 * saved already-read: the live draft is what the alert list shows, the row is
 * the push record.
 *
 * ponytail: two concurrent reads can both miss the dedup row and push twice;
 * a unique partial index if that ever matters.
 */
@Injectable()
export class DiseaseAlertService {
  private readonly logger = new Logger(DiseaseAlertService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly alerts: AlertsService,
    private readonly push: PushService,
  ) {}

  private q(sql: string, params: unknown[]): Promise<any[]> {
    return this.dataSource.query(sql, params);
  }

  /** Never throws: a failed push must not fail the alert-center read. */
  async notify(criticals: CriticalDisease[], now = new Date()): Promise<number> {
    if (!criticals.length) return 0;
    try {
      const pondIds = [...new Set(criticals.map((c) => c.pondId))];
      const sent = await this.q(
        `SELECT DISTINCT pond_id AS "pondId", data->>'disease' AS disease FROM alerts
          WHERE type = 'disease' AND pond_id = ANY($1::uuid[]) AND created_at > $2`,
        [pondIds, new Date(now.getTime() - DISEASE_PUSH_EVERY_MS)],
      );
      const seen = new Set(sent.map((r: any) => `${r.pondId}|${r.disease}`));
      const fresh = criticals.filter((c) => !seen.has(`${c.pondId}|${c.disease}`));
      if (!fresh.length) return 0;

      const ponds = await this.q(
        `SELECT p.id AS "pondId", coalesce(nullif(p.display_name, ''), p.name) AS "pondName",
                f.id AS "farmId", f.user_id AS "ownerId"
           FROM ponds p JOIN farms f ON f.id = p.farm_id WHERE p.id = ANY($1::uuid[])`,
        [[...new Set(fresh.map((c) => c.pondId))]],
      );
      const pondBy = new Map<string, any>(ponds.map((p: any) => [p.pondId, p]));
      const farmIds = [...new Set(ponds.map((p: any) => p.farmId))];
      const managers = await this.q(
        `SELECT farm_id AS "farmId", user_id AS "userId" FROM farm_members
          WHERE farm_id = ANY($1::uuid[]) AND role = 'manager' AND status = 'active'`,
        [farmIds],
      ).catch((err) => {
        if (isMissingSchema(err)) return [];
        throw err;
      });
      const recipientsOf = (farmId: string, ownerId: string) => [
        ...new Set<string>([
          ownerId,
          ...managers.filter((m: any) => m.farmId === farmId).map((m: any) => m.userId),
        ]),
      ].filter(Boolean);
      const everyone = [...new Set(ponds.flatMap((p: any) => recipientsOf(p.farmId, p.ownerId)))];
      const langs = await this.q(
        `SELECT id, language_preference AS lang FROM profiles WHERE id = ANY($1::uuid[])`,
        [everyone],
      ).catch(() => [] as any[]);
      const langOf = new Map<string, string>(langs.map((l: any) => [l.id, l.lang]));

      let pushed = 0;
      for (const c of fresh) {
        const p = pondBy.get(c.pondId);
        if (!p) continue;
        const params = { pond: p.pondName ?? '', disease: SHORT[c.disease] };
        for (const userId of recipientsOf(p.farmId, p.ownerId)) {
          const lang = langOf.get(userId) ?? 'en';
          const text = DISEASE_PUSH[lang] ?? DISEASE_PUSH.en;
          const ok = await this.push.sendToUser(userId, {
            title: DISEASE_PUSH_TITLE[lang] ?? DISEASE_PUSH_TITLE.en,
            body: text.body,
            data: { type: 'disease', pondId: c.pondId, disease: c.disease },
          });
          await this.alerts.create({
            userId,
            farmId: p.farmId,
            pondId: c.pondId,
            type: 'disease',
            severity: 'critical',
            title: fill(DISEASE_PUSH.en.title, params),
            message: DISEASE_PUSH.en.body,
            isRead: true,
            isPushSent: !!ok,
            data: { source: 'disease', disease: c.disease, band: 'Critical', steps: [] },
          } as any);
          if (ok) pushed++;
        }
      }
      return pushed;
    } catch (err: any) {
      this.logger.warn(`Disease alert push failed: ${err?.message ?? err}`);
      return 0;
    }
  }
}
