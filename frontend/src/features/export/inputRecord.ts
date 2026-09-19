/**
 * Cycle input record (disease spec D4) -> ReportData.
 *
 * One call (`GET /crops/:id/input-record`, owner/manager only, no money) and
 * seven fixed sections. Unlike the cycle report, an empty section is NOT
 * dropped: a processor reading "Inputs: not logged" learns something, and a
 * missing heading reads as a hidden one. Anything absent says "not logged",
 * never "0".
 *
 * No QR, no public link, no certificate language: this is a farm record.
 */
import { reportsApi, type InputRecord } from '../../api/reports';
import { PCR_TESTS } from '../../api/biosecurity';
import { useIngredientsStore, ingredientName } from '../ingredientsStore';
import type { Fmt } from './collect';
import type { ReportTable } from './types';

export interface InputRecordCollected {
    scope: { farmName?: string; pondName?: string; cycleLabel?: string };
    tables: ReportTable[];
    disclaimer: string;
}

/**
 * The antimicrobial statement. Exact wording (spec D4.5), never softened: a
 * `none_logged` cycle gets the one fixed sentence with the list date; anything
 * else gets the substances with their dates, and no reassurance at all.
 */
/** The list version is a bare day; read at noon so no timezone shifts it. */
const listDate = (f: Fmt, v: string) => f.date(`${v.slice(0, 10)}T12:00:00`);

export const antimicrobialTable =(f: Fmt, a: InputRecord['antimicrobial']): ReportTable => {
    const t = f.t;
    if (a.status === 'none_logged') {
        return {
            key: 'treatments',
            title: t('export.ir.antimicrobial'),
            columns: [t('export.ir.statement')],
            rows: [[t('export.ir.noneLogged', { date: listDate(f, a.listVersion) })]],
        };
    }
    return {
        key: 'treatments',
        title: t('export.ir.antimicrobial'),
        columns: [t('export.ir.date'), t('export.ir.substances'), t('export.ir.flag'), t('export.ir.source')],
        rows: a.items.map((i) => [
            f.date(i.date),
            i.substances.join(', '),
            t(`compliance.flag.${i.flag}`),
            t(`export.ir.source_${i.source}`),
        ]),
    };
};

export const buildInputRecord = (f: Fmt, r: InputRecord, language: string): InputRecordCollected => {
    const t = f.t;
    const NL = t('export.ir.notLogged');
    const or = (v: string | null | undefined) => (v == null || v === '' ? NL : v);
    const pair = (label: string, value: string) => [label, value];
    const kv = (key: ReportTable['key'], title: string, rows: string[][]): ReportTable => ({
        key,
        title,
        columns: [t('export.ir.item'), t('export.ir.detail')],
        rows,
    });
    // An empty list is one "not logged" row under the real headings.
    const orNone = (rows: string[][], width: number) =>
        rows.length ? rows : [[NL, ...Array(width - 1).fill('')]];

    const catalogue = useIngredientsStore.getState().ingredients;
    const ingredient = (k: string) => {
        const i = catalogue.find((x) => x.key === k);
        return i ? ingredientName(i, language) : k;
    };

    const farmPond = kv('summary', t('export.ir.farmPond'), [
        pair(t('export.ir.farm'), or(r.farm.name)),
        pair(t('export.ir.caaNo'), or(r.farm.caaRegistrationNo)),
        pair(t('export.ir.pond'), or(r.pond.name)),
        pair(t('export.ir.pondArea'), r.pond.areaM2 == null ? NL : t('export.ir.areaValue', { m2: f.num(r.pond.areaM2, 0) })),
        pair(t('export.ir.cycle'), or(r.cycle.cropCode ? `${r.cycle.name} (${r.cycle.cropCode})` : r.cycle.name)),
    ]);

    const s = r.seed;
    const pcr = s?.plPcrResults;
    const seed = kv('summary', t('export.ir.seed'), [
        pair(t('export.ir.hatchery'), or(r.cycle.hatchery)),
        pair(t('export.ir.stockingDate'), r.cycle.stockingDate ? f.date(r.cycle.stockingDate) : NL),
        pair(t('export.ir.stockingCount'), r.cycle.stockingCount == null ? NL : f.num(r.cycle.stockingCount, 0)),
        pair(t('biosecurity.spf'), s?.plSpf == null ? NL : t(s.plSpf ? 'export.ir.yes' : 'export.ir.no')),
        ...PCR_TESTS.map((k) =>
            pair(`PCR · ${t(`biosecurity.pcr.${k}`)}`, pcr?.[k] ? t(`biosecurity.result.${pcr[k]}`) : NL),
        ),
        pair(t('biosecurity.pcrLab'), or(s?.plPcrLab)),
        pair(t('biosecurity.pcrDate'), s?.plPcrDate ? f.date(s.plPcrDate) : NL),
    ]);

    const inputs: ReportTable = {
        key: 'treatments',
        title: t('export.ir.inputs'),
        columns: [
            t('export.ir.date'), t('export.ir.category'), t('export.ir.ingredients'), t('export.ir.product'),
            t('export.ir.dose'), t('export.ir.reason'), t('export.ir.flag'),
        ],
        rows: orNone(
            r.treatments.map((x) => [
                f.date(x.date),
                x.category ? t(`compliance.category.${x.category}`) : '',
                x.ingredientKeys.map(ingredient).join(', '),
                // Old free-text rows carry everything in the description.
                x.productName || x.description || '',
                x.doseValue == null ? '' : `${f.num(x.doseValue)}${x.doseUnit ? ` ${t(`compliance.unit.${x.doseUnit}`)}` : ''}`,
                x.reason ? t(`compliance.reason.${x.reason}`) : '',
                x.flag && x.flag !== 'none'
                    ? `${t(`compliance.flag.${x.flag}`)}${x.matches.length ? `: ${x.matches.join(', ')}` : ''}`
                    : '',
            ]),
            7,
        ),
    };

    const feed: ReportTable = {
        key: 'feed',
        title: t('export.ir.feedBrands'),
        columns: [t('export.ir.brand')],
        rows: orNone(r.feedBrands.map((b) => [b]), 1),
    };

    const { diseases, mortality, doBelow3Days } = r.health;
    const health: ReportTable = {
        key: 'disease',
        title: t('export.ir.health'),
        columns: [t('export.ir.date'), t('export.ir.disease'), t('export.ir.confirmedBy'), t('export.ir.outcome')],
        rows: [
            ...orNone(
                diseases.map((d) => [
                    f.date(d.date),
                    or(d.name),
                    d.confirmedBy
                        ? `${t(`health.confirmed.${d.confirmedBy}`)}${d.labName ? ` (${d.labName})` : ''}`
                        : NL,
                    t(`health.outcome.${d.outcome ?? 'ongoing'}`),
                ]),
                4,
            ),
            [
                '', t('export.ir.mortality'),
                mortality ? t('export.ir.mortalityValue', { count: f.num(mortality.count, 0), records: f.num(mortality.records, 0) }) : NL,
                '',
            ],
            [
                '', t('export.ir.doBelow3'),
                doBelow3Days ? t('export.ir.doValue', { days: f.num(doBelow3Days.days, 0), of: f.num(doBelow3Days.of, 0) }) : NL,
                '',
            ],
        ],
    };

    const harvest: ReportTable = {
        key: 'harvest',
        title: t('export.ir.harvest'),
        columns: [t('export.ir.date'), t('export.ir.type'), t('export.ir.kg'), t('export.ir.grades')],
        numericColumns: [2],
        rows: orNone(
            r.harvests.map((h) => [
                f.date(h.date),
                h.type ? t(`export.ir.type_${h.type}`) : '',
                f.num(h.weightKg),
                h.grades.length
                    ? h.grades
                        .map((g) => t('export.ir.gradeLine', { count: g.countPerKg == null ? '?' : f.num(g.countPerKg, 0), kg: f.num(g.weightKg) }))
                        .join('; ')
                    : t('export.ir.ungraded'),
            ]),
            4,
        ),
    };

    return {
        scope: {
            farmName: r.farm.name ?? undefined,
            pondName: r.pond.name ?? undefined,
            cycleLabel: r.cycle.name ?? undefined,
        },
        tables: [farmPond, seed, inputs, feed, health, antimicrobialTable(f, r.antimicrobial), harvest],
        disclaimer: t('export.ir.footer', { date: listDate(f, r.antimicrobial.listVersion) }),
    };
};

export const collectInputRecord = async (cropId: string, f: Fmt, language: string): Promise<InputRecordCollected> => {
    // Ingredient names come from the offline catalogue; fetch it if cold.
    if (!useIngredientsStore.getState().ingredients.length) {
        await useIngredientsStore.getState().hydrate().catch(() => undefined);
    }
    const { data } = await reportsApi.getInputRecord(cropId);
    return buildInputRecord(f, data, language);
};
