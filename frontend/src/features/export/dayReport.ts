/**
 * Day report exports: a localized PDF and a shareable PNG card of one DailyBrief.
 *
 * PDF — `buildDayReportData` turns the brief into the export pipeline's
 * `ReportData` (stats + tables), so the existing template, Indic font stack,
 * escaping and `deliver` are reused unchanged. No extra network call: the
 * screen already holds the brief.
 *
 * Image — react-native-svg's `toDataURL` needs a MOUNTED <Svg>, so the card is
 * drawn by a host component the screen mounts once, invisibly:
 *
 *     import { DayCardRenderer } from '../../components/brief/DayCardSvg';
 *     ...
 *     <DayCardRenderer />            // anywhere inside the screen tree
 *     onPress={() => shareDayCardImage(brief, i18n.language)}
 *
 * The renderer registers itself here (`registerDayCardHost`); `shareDayCardImage`
 * hands it a pre-laid-out `DayCardModel`, waits for the ref, and converts it with
 * the same technique as utils/shareQrImage.ts. No host mounted, no share sheet,
 * a conversion error or timeout ⇒ falls back to the PDF.
 */

import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import i18n, { loadLocale } from '../../i18n';
import type { Band, DailyBrief, ScorePart, StoryTone } from '../../api/dailyBrief';
import {
    coverageSentence,
    fmtNum,
    localNoon,
    reasonText as briefReasonText,
    shiftLine,
    staleLapse,
    storySentence,
    verdictSentence,
    workLine,
} from '../dailyBriefText';
import { svgToPngBase64, type SvgRef } from '../../utils/shareQrImage';
import { makeFmt, type Fmt } from './collect';
import { deliver, safeFilename } from './deliver';
import { ExportError } from './index';
import { renderReportHtml } from './pdf/renderReportHtml';
import type { ReportData, ReportStat, ReportTable } from './types';

const DASH = '—';
const PARTS: ScorePart[] = ['water', 'feeding', 'health', 'care'];

// Reason and verdict sentences are owned by the Daily Brief screen (dailyBrief.* keys), so all three surfaces agree.
const reasonText = (f: Fmt, r: Parameters<typeof briefReasonText>[0]) => briefReasonText(r, f.t);

const signed = (f: Fmt, now: number, prev: number | null, digits = 2) =>
    prev == null ? undefined : f.t('dayReport.vsPrevious', { value: `${now - prev >= 0 ? '+' : ''}${f.num(now - prev, digits)}` });

const rangeText = (f: Fmt, min: number | null | undefined, max: number | null | undefined) =>
    min == null && max == null ? DASH : min === max || max == null ? f.num(min) : `${f.num(min)}–${f.num(max)}`;

/** The farm band to print: too few stocked ponds scored ⇒ 'incomplete', never Good/Watch/Attention. */
const bandKey = (brief: DailyBrief): Band | 'incomplete' | 'none' =>
    !brief.score ? 'none' : brief.verdict.band === 'incomplete' ? 'incomplete' : brief.score.band;

// ── PDF ──────────────────────────────────────────────────────────────────────

export const buildDayReportData = async (brief: DailyBrief, lang: string, now: Date = new Date()): Promise<ReportData> => {
    await loadLocale(lang);
    const f = makeFmt(lang);
    const t = f.t;
    const pondName = (id: string | null | undefined) => brief.ponds.find((p) => p.pondId === id)?.name ?? DASH;
    const past = !brief.isToday;
    const s = brief.score;
    const tot = brief.totals;
    const band = bandKey(brief);
    const coverage = coverageSentence(brief, t);

    const stats: ReportStat[] = [
        s
            ? { label: t('dayReport.score'), value: `${s.value}/100`, hint: t(`dayReport.band_${band}`) }
            : { label: t('dayReport.score'), value: t('dayReport.noScore') },
        { label: t('dayReport.feedKg'), value: `${f.num(tot.feedKg)} kg`, hint: signed(f, tot.feedKg, tot.feedKgPrev) },
        { label: t('dayReport.deaths'), value: f.num(tot.mortality, 0), hint: signed(f, tot.mortality, tot.mortalityPrev, 0) },
        { label: t('dayReport.waterTests'), value: f.num(tot.waterTests, 0) },
        { label: t('dayReport.samplings'), value: f.num(tot.samplings, 0) },
        { label: t('dayReport.harvestKg'), value: `${f.num(tot.harvestKg)} kg` },
        { label: t('dayReport.treatments'), value: f.num(tot.treatments, 0) },
    ];
    // Money is null from the server without VIEW_FINANCIALS; check the flag too so a stale payload never leaks it.
    if (brief.canViewFinancials) {
        if (tot.spend != null) stats.push({ label: t('dayReport.spend'), value: f.money(tot.spend) });
        if (tot.income != null) stats.push({ label: t('dayReport.income'), value: f.money(tot.income) });
    }

    const partNames = (ps: ScorePart[]) => (ps.length ? ps.map((p) => t(`dayReport.part_${p}`)).join(', ') : DASH);
    const summaryRows: string[][] = [[t('dayReport.verdict'), verdictSentence(brief, t)]];
    if (s) {
        summaryRows.push(
            [t('dayReport.score'), `${s.value}/100 · ${t(`dayReport.band_${band}`)}`],
            ...(coverage ? [[t('dayReport.coverage'), coverage]] : []),
            [t('dayReport.basedOn'), partNames(s.basedOn)],
            [t('dayReport.notLogged'), partNames(s.missing)],
        );
        if (s.capped) summaryRows.push([t('dayReport.cappedBecause'), s.capReasons.map((r) => reasonText(f, r)).join('; ') || DASH]);
    } else {
        summaryRows.push([t('dayReport.score'), `${t('dayReport.noScore')} — ${t('dayReport.noScoreWhy')}`]);
    }

    const detail = (key: string) => [t('dayReport.item'), t('dayReport.pond'), key];
    const done = brief.done;
    const withShift = !!done?.people.some((p) => p.shift?.checkIn);

    const tables: (ReportTable | null)[] = [
        { key: 'summary', title: t('dayReport.summaryTitle'), columns: [t('dayReport.item'), t('dayReport.detail')], rows: summaryRows },
        {
            key: 'summary',
            title: t('dayReport.storyTitle'),
            columns: [t('dayReport.status'), t('dayReport.detail')],
            rows: (brief.story ?? []).map((it) => [t(`dailyBrief.story.tone.${it.tone}`), storySentence(it, brief, t)]),
        },
        done
            ? {
                key: 'summary',
                title: t('dayReport.peopleTitle'),
                columns: [t('dayReport.person'), t('dayReport.role'), t('dayReport.work'), t('dayReport.pondsWorked'), ...(withShift ? [t('dayReport.shift')] : [])],
                numericColumns: [3],
                rows: done.people.map((p) => [
                    p.name,
                    p.role ? t(`members.role_${p.role}`) : DASH,
                    workLine(p.counts, p.feedKg, t, p.tasksDone) || DASH,
                    f.num(p.pondIds.length, 0),
                    ...(withShift ? [shiftLine(p.shift, t) ?? DASH] : []),
                ]),
            }
            : null,
        done
            ? {
                key: 'summary',
                title: t('dayReport.pondWorkTitle'),
                columns: [t('dayReport.pond'), t('dayReport.work'), t('dayReport.feed'), t('dayReport.sampling'), t('dayReport.harvestKg'), t('dayReport.people')],
                rows: done.ponds.map((w) => {
                    const { feed: _feed, ...rest } = w.counts;
                    return [
                        pondName(w.pondId),
                        workLine(rest, 0, t) || DASH,
                        w.feedRounds > 0 ? t('dailyBrief.done.feedRounds', { count: w.feedRounds, kg: fmtNum(w.feedKg) }) : DASH,
                        w.samplingG != null ? `${f.num(w.samplingG)} g` : DASH,
                        w.harvestKg != null ? f.num(w.harvestKg) : DASH,
                        w.people.join(', ') || DASH,
                    ];
                }),
            }
            : null,
        s
            ? {
                key: 'summary',
                title: t('dayReport.partsTitle'),
                columns: [t('dayReport.part'), t('dayReport.points'), t('dayReport.status')],
                numericColumns: [1],
                rows: PARTS.map((p) => [
                    t(`dayReport.part_${p}`),
                    s.parts[p].measured ? `${f.num(s.parts[p].earned, 1)} / ${f.num(s.parts[p].possible, 0)}` : DASH,
                    t(s.parts[p].measured ? 'dayReport.measured' : 'dayReport.notLoggedShort'),
                ]),
            }
            : null,
        {
            key: 'summary',
            title: t('dayReport.pondsTitle'),
            columns: [t('dayReport.pond'), t('dayReport.doc'), t('dayReport.score'), t('dayReport.minDo'), t('dayReport.ph'), t('dayReport.feedKg'), t('dayReport.deaths')],
            numericColumns: [1, 2, 3, 5, 6],
            rows: brief.ponds.map((p) => [
                p.name,
                f.num(p.doc, 0),
                p.score ? `${p.score.value} · ${t(`dayReport.band_${p.score.band}`)}` : t('dayReport.noScore'),
                f.num(p.water.do?.min),
                rangeText(f, p.water.ph?.min, p.water.ph?.max),
                f.num(p.feed.kg),
                f.num(p.health.mortality, 0),
            ]),
        },
        {
            key: 'summary',
            title: t('dayReport.todoTitle'),
            columns: detail(t('dayReport.status')),
            rows: [
                ...brief.todo.tasks.map((tk) => [
                    tk.title,
                    pondName(tk.pondId),
                    t(
                        tk.status === 'done' || tk.status === 'verified'
                            ? 'dayReport.done'
                            : tk.status === 'cancelled'
                              ? 'dayReport.cancelled'
                              : past ? 'dayReport.missed' : 'dayReport.open',
                    ),
                ]),
                ...brief.todo.missingLogs.flatMap((m) =>
                    m.kinds.map((k) => [t(`dayReport.log_${k}`), pondName(m.pondId), t(past ? 'dayReport.missed' : 'dayReport.open')]),
                ),
                ...brief.todo.moltItems.map((m) => [
                    t(`engines.lunar.item_${m.key}`, { defaultValue: m.key }),
                    pondName(m.pondId),
                    t(`engines.lunar.status_${m.status}`, { defaultValue: m.status }),
                ]),
            ],
        },
        {
            key: 'summary',
            title: t('dayReport.carriedTitle'),
            columns: detail(t('dayReport.detail')),
            rows: [
                // Unwatched ponds lead, as on the screen.
                ...(brief.carriedOver.stalePonds ?? []).map((sp) => {
                    const { kind, days } = staleLapse(sp);
                    return [
                        t(`dayReport.stalePond_${sp.severity}`),
                        pondName(sp.pondId),
                        t(kind === 'nothing' ? 'dayReport.staleNothing' : 'dayReport.staleWater', { count: days }),
                    ];
                }),
                ...brief.carriedOver.openAlerts.map((a) => [a.title, pondName(a.pondId), t(`dayReport.severity_${a.severity}`)]),
                ...brief.carriedOver.overdueTasks.map((tk) => [tk.title, pondName(tk.pondId), t('dayReport.overdueSince', { date: f.date(tk.dueDate) })]),
                ...(brief.carriedOver.worstPrevious
                    ? [[t('dayReport.worstPrevious'), pondName(brief.carriedOver.worstPrevious.pondId), reasonText(f, brief.carriedOver.worstPrevious.reason)]]
                    : []),
                ...brief.carriedOver.moltPending.map((m) => [
                    t('dayReport.moltPending'),
                    pondName(m.pondId),
                    m.keys.map((k) => t(`engines.lunar.item_${k}`, { defaultValue: k })).join(', '),
                ]),
            ],
        },
        {
            key: 'summary',
            title: t('dayReport.happeningTitle'),
            columns: detail(t('dayReport.detail')),
            rows: [
                ...(brief.happening.molt
                    ? [[
                        t('dayReport.moltPhase', { phase: t(`engines.lunar.phase_${brief.happening.molt.phase}`) }),
                        DASH,
                        brief.happening.molt.peakDate ? t('dayReport.peakOn', { date: f.date(brief.happening.molt.peakDate) }) : DASH,
                    ]]
                    : []),
                ...brief.happening.harvestsPlanned.map((h) => [
                    t('dayReport.harvestPlanned'),
                    pondName(h.pondId),
                    h.targetWeightKg != null ? `${f.date(h.plannedDate)} · ${f.num(h.targetWeightKg)} kg` : f.date(h.plannedDate),
                ]),
                ...brief.happening.milestones.map((m) => [t(`dayReport.milestone_${m.kind}`), pondName(m.pondId), t('dayReport.docValue', { doc: m.doc })]),
                ...brief.happening.lowStock.map((i) => [t('dayReport.lowStock'), DASH, `${i.name} · ${f.num(i.quantity)} ${i.unit}`]),
                ...(brief.happening.attendance
                    ? [[t('dayReport.attendance'), DASH, `${brief.happening.attendance.present} / ${brief.happening.attendance.total}`]]
                    : []),
            ],
        },
    ];

    return {
        meta: {
            documentTitle: t('dayReport.title'),
            farmName: brief.farm?.name ?? t('dayReport.allFarms'),
            periodLabel: f.date(localNoon(brief.date)),
            generatedAt: `${f.date(now)} ${f.time(now)}`,
            attribution: t('dayReport.attribution', { app: t('common.appName') }),
        },
        stats,
        // Empty sections are omitted, never printed as a bare heading.
        tables: tables.filter((tb): tb is ReportTable => !!tb && tb.rows.length > 0),
        disclaimer: t('dayReport.disclaimer'),
    };
};

const fileStem = (brief: DailyBrief, kind: string) =>
    safeFilename([i18n.t('common.appName'), kind, brief.farm?.name, brief.date], 'pdf').replace(/\.pdf$/, '');

export const exportDayReportPdf = async (brief: DailyBrief, lang: string): Promise<void> => {
    let data: ReportData;
    let uri: string;
    try {
        data = await buildDayReportData(brief, lang);
        uri = (await Print.printToFileAsync({ html: renderReportHtml(data, lang) })).uri;
    } catch (e) {
        throw new ExportError('render', 'Could not build the day report', e);
    }
    try {
        await deliver({ filename: `${fileStem(brief, 'day')}.pdf`, format: 'pdf', sourceUri: uri, dialogTitle: data.meta.documentTitle });
    } catch (e) {
        throw new ExportError('write', 'Could not save or share the file', e);
    }
};

// ── Image card ───────────────────────────────────────────────────────────────

export const CARD_W = 1080;
export const CARD_H = 1350;
const HOST_TIMEOUT_MS = 3000;

export interface DayCardModel {
    appName: string;
    farm: string;
    date: string;
    /** Score number, or the localized "No score". */
    score: string;
    /** True when `score` is a number — drawn huge; "No score" is drawn smaller. */
    hasScore: boolean;
    band: string;
    /** Why there is no score, or the cap note. */
    scoreNote: string[];
    colors: { text: string; bg: string; border: string };
    verdict: string[];
    numbers: { label: string; value: string }[];
    weakest: string[];
    /** Top 3 story items, wrapped (≤ 2 lines each, ≤ 5 lines in all), with the tone for its mark. Empty on older backends. */
    story: { lines: string[]; tone: StoryTone }[];
}

export const STORY_FONT = 30;
const STORY_MAX_LINES = 5;

const storyLines = (brief: DailyBrief, t: Fmt['t']): DayCardModel['story'] => {
    let left = STORY_MAX_LINES;
    return (brief.story ?? []).slice(0, 3).flatMap((it) => {
        if (left <= 0) return [];
        const lines = wrapText(storySentence(it, brief, t), STORY_FONT, 900, Math.min(2, left));
        left -= lines.length;
        return [{ lines, tone: it.tone }];
    });
};

const BAND_COLORS: Record<Band | 'none' | 'incomplete', DayCardModel['colors']> = {
    good: { text: '#1A6B3A', bg: '#EAF7EE', border: '#27A855' },
    watch: { text: '#8A4700', bg: '#FEF6E4', border: '#F08C00' },
    attention: { text: '#A41B1B', bg: '#FDF0F0', border: '#E03535' },
    none: { text: '#3E5163', bg: '#F5F8FA', border: '#C8D4DA' },
    incomplete: { text: '#7A8A96', bg: '#F0F3F5', border: '#C8D4DA' },
};

/** Indic / non-Latin glyphs run wider than Latin at the same size. */
const NON_LATIN = /[^ -ɏ -⁯]/;

/**
 * Greedy word wrap by estimated glyph width. Conservative on purpose: SVG Text
 * cannot measure, and an overflowing line is cut off in the PNG.
 * ponytail: width is estimated per code point, not measured; switch to
 * onLayout measurement if real cards still clip in some script.
 */
export const wrapText = (text: string, fontSize: number, maxWidth: number, maxLines: number): string[] => {
    const perChar = fontSize * (NON_LATIN.test(text) ? 0.68 : 0.56);
    const max = Math.max(4, Math.floor(maxWidth / perChar));
    const len = (s: string) => Array.from(s).length;
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
        let w = word;
        while (len(w) > max) {
            if (line) { lines.push(line); line = ''; }
            lines.push(Array.from(w).slice(0, max).join(''));
            w = Array.from(w).slice(max).join('');
        }
        if (!line) line = w;
        else if (len(line) + 1 + len(w) <= max) line += ` ${w}`;
        else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${Array.from(kept[maxLines - 1]).slice(0, max - 1).join('')}…`;
    return kept;
};

export const buildDayCardModel = (brief: DailyBrief, lang: string): DayCardModel => {
    const f = makeFmt(lang);
    const t = f.t;
    const s = brief.score;
    const tot = brief.totals;
    const weakest = brief.ponds.find((p) => p.pondId === brief.verdict.weakestPondId);
    const band = bandKey(brief);
    const coverage = coverageSentence(brief, t);
    // An incomplete day leads with how little it rests on; otherwise the cap, then coverage.
    const note = !s
        ? t('dayReport.noScoreWhy')
        : band === 'incomplete'
          ? coverage ?? ''
          : s.capped && s.capReasons[0] ? t('dayReport.cappedNote', { reason: reasonText(f, s.capReasons[0]) }) : coverage ?? '';

    return {
        appName: t('common.appName'),
        farm: wrapText(brief.farm?.name ?? t('dayReport.allFarms'), 56, 952, 1)[0] ?? '',
        date: f.date(localNoon(brief.date)),
        score: s ? String(s.value) : t('dayReport.noScore'),
        hasScore: !!s,
        band: s ? t(`dayReport.band_${band}`) : '',
        scoreNote: note ? wrapText(note, 36, 860, 2) : [],
        colors: BAND_COLORS[band],
        // Two verdict lines leave room for the story under it.
        verdict: wrapText(verdictSentence(brief, t), 48, 952, 2),
        story: storyLines(brief, t),
        numbers: [
            { label: t('dayReport.feedKg'), value: f.num(tot.feedKg, 1) },
            { label: t('dayReport.deaths'), value: f.num(tot.mortality, 0) },
            { label: t('dayReport.waterTests'), value: f.num(tot.waterTests, 0) },
            { label: t('dayReport.harvestKg'), value: f.num(tot.harvestKg, 1) },
        ].map((n) => ({ label: wrapText(n.label, 34, 420, 1)[0] ?? '', value: n.value })),
        weakest: weakest
            ? wrapText(
                t('dayReport.weakestPond', { pond: weakest.name, score: weakest.score ? weakest.score.value : t('dayReport.noScore') }),
                36, 952, 1,
            )
            : [],
    };
};

export type DayCardHost = (model: DayCardModel) => Promise<SvgRef>;
let host: DayCardHost | null = null;

/** Called by <DayCardRenderer/>. Returns the unregister function for its effect cleanup. */
export const registerDayCardHost = (h: DayCardHost): (() => void) => {
    host = h;
    return () => {
        if (host === h) host = null;
    };
};

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('day card host timed out')), ms);
        p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });

export const shareDayCardImage = async (brief: DailyBrief, lang: string): Promise<void> => {
    let uri: string;
    try {
        if (!host) throw new Error('no day card renderer mounted');
        if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
        await loadLocale(lang);
        const ref = await withTimeout(host(buildDayCardModel(brief, lang)), HOST_TIMEOUT_MS);
        const base64 = await svgToPngBase64(ref, CARD_W, CARD_H);
        const file = new File(Paths.cache, `${fileStem(brief, 'day')}.png`);
        if (file.exists) file.delete();
        file.create();
        file.write(base64, { encoding: 'base64' });
        uri = file.uri;
    } catch {
        return exportDayReportPdf(brief, lang);
    }
    try {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: i18n.getFixedT(lang)('dayReport.title') });
    } catch {
        // Dismissed — the image was offered; do not follow up with a PDF.
    }
};
