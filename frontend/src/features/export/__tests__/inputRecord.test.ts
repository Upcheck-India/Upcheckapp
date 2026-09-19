/**
 * Cycle input record (disease spec D4). The document leaves the farm, so the
 * wording is load-bearing: the none-logged statement is exact, a flagged cycle
 * lists every substance with its date, a missing fact reads "not logged"
 * (never 0), and nothing money-shaped gets in.
 */
jest.mock('../../../api/reports', () => ({ reportsApi: { getInputRecord: jest.fn() } }));

import { reportsApi, type InputRecord } from '../../../api/reports';
import { collectReport, makeFmt } from '../collect';
import { antimicrobialTable, buildInputRecord } from '../inputRecord';
import { renderReportHtml } from '../pdf/renderReportHtml';
import { ALL_SECTIONS } from '../types';

const record = (over: Partial<InputRecord> = {}): InputRecord => ({
    cropId: 'c1',
    farm: { name: 'Green Acres', caaRegistrationNo: 'CAA/AP/2024/123' },
    pond: { name: 'Pond 3', areaM2: 5000 },
    cycle: { name: 'Cycle 7', cropCode: 'C-7', hatchery: 'Sea Hatchery', stockingDate: '2026-06-01', stockingCount: 120000, endDate: '2026-09-10' },
    seed: { plSpf: true, plPcrDate: '2026-05-30', plPcrLab: 'RGCA', plPcrResults: { wssv: 'negative', ehp: 'negative' } },
    treatments: [
        {
            date: '2026-08-12', category: 'mineral', ingredientKeys: ['potassium_chloride'], productName: 'Aqua Mix',
            description: null, doseValue: 25, doseUnit: 'kg', reason: 'molt_prep', flag: 'none', matches: [],
        },
    ],
    feedBrands: ['Avanti'],
    health: {
        diseases: [{ date: '2026-08-20', name: 'WSSV', confirmedBy: 'pcr', labName: 'Lab X', outcome: 'recovered' }],
        mortality: { records: 3, count: 120 },
        doBelow3Days: { days: 2, of: 80 },
    },
    antimicrobial: { status: 'none_logged', items: [], listVersion: '2026-07-08' },
    harvests: [{ date: '2026-09-10', type: 'full', weightKg: 1000, grades: [{ countPerKg: 40, weightKg: 800 }, { countPerKg: 60, weightKg: 200 }] }],
    ...over,
});

const f = makeFmt('en');
const cells = (r: InputRecord) => buildInputRecord(f, r, 'en').tables.flatMap((tb) => [tb.title, ...tb.columns, ...tb.rows.flat()]);

describe('antimicrobial statement', () => {
    it('none_logged: the exact sentence, with the list date', () => {
        const tb = antimicrobialTable(f, record().antimicrobial);
        expect(tb.rows).toEqual([[
            'No antimicrobial or banned substance was recorded in Neerani for this cycle (checked against the list of 8 Jul 2026). This record reflects only what the farm logged.',
        ]]);
    });

    it('banned_logged: every substance with its date, and no reassurance', () => {
        const tb = antimicrobialTable(f, {
            status: 'banned_logged',
            listVersion: '2026-07-08',
            items: [
                { date: '2026-07-01', source: 'treatment', recordId: 't1', substances: ['Chloramphenicol'], flag: 'banned' },
                { date: '2026-08-02', source: 'disease', recordId: 'd1', substances: ['Oxytetracycline', 'Enrofloxacin'], flag: 'restricted' },
            ],
        });
        expect(tb.rows).toEqual([
            ['1 Jul 2026', 'Chloramphenicol', 'Banned', 'Treatment'],
            ['2 Aug 2026', 'Oxytetracycline, Enrofloxacin', 'Restricted', 'Disease record'],
        ]);
        expect(JSON.stringify(tb)).not.toContain('No antimicrobial');
    });

    it('restricted_logged is listed too, never the none-logged sentence', () => {
        const tb = antimicrobialTable(f, {
            status: 'restricted_logged',
            listVersion: '2026-07-08',
            items: [{ date: '2026-08-02', source: 'treatment', recordId: 't1', substances: ['Oxytetracycline'], flag: 'restricted' }],
        });
        expect(tb.rows).toEqual([['2 Aug 2026', 'Oxytetracycline', 'Restricted', 'Treatment']]);
    });
});

describe('sections', () => {
    it('carries every spec section, CAA number and grades', () => {
        const c = cells(record());
        for (const s of ['Green Acres', 'CAA/AP/2024/123', '5,000 m²', 'Sea Hatchery', 'RGCA', 'Aqua Mix', 'Molt prep', 'Avanti', 'WSSV', 'Recovered', '120 shrimp in 3 records', '2 of 80 days measured', '40/kg: 800 kg; 60/kg: 200 kg']) {
            expect(c).toContain(s);
        }
    });

    it('an empty cycle says "not logged", never 0, and keeps every heading', () => {
        const empty = record({
            farm: { name: 'Green Acres', caaRegistrationNo: null },
            pond: { name: 'Pond 3', areaM2: null },
            cycle: { name: 'Cycle 7', cropCode: null, hatchery: null, stockingDate: null, stockingCount: null, endDate: null },
            seed: null,
            treatments: [],
            feedBrands: [],
            health: { diseases: [], mortality: null, doBelow3Days: null },
            harvests: [],
        });
        const out = buildInputRecord(f, empty, 'en');
        expect(out.tables).toHaveLength(7);
        const c = cells(empty);
        expect(c.filter((x) => x === 'not logged').length).toBeGreaterThanOrEqual(12);
        expect(c).not.toContain('0');
        expect(out.tables.every((tb) => tb.rows.length > 0)).toBe(true);
    });

    it('footer: a farm record, not a certificate, with the list version', () => {
        expect(buildInputRecord(f, record(), 'en').disclaimer).toBe(
            'This is a farm record, not a certificate or test result. Banned-substance list of 8 Jul 2026.',
        );
    });
});

describe('the document', () => {
    it('renders with no money and no certificate/QR claims', async () => {
        (reportsApi.getInputRecord as jest.Mock).mockResolvedValue({ data: record() });
        const data = await collectReport(
            { dataset: 'inputRecord', format: 'pdf', cropId: 'c1', sections: ALL_SECTIONS, language: 'en' },
            new Date('2026-09-19T10:00:00+05:30'),
        );
        expect(data.meta.documentTitle).toBe('Cycle input record');
        const html = renderReportHtml(data, 'en');
        expect(html).toContain('recorded in Neerani for this cycle');
        expect(html).not.toMatch(/₹|price|revenue|profit|QR|certified/i);
    });

    it('renders in the viewer locale when asked (not English)', async () => {
        (reportsApi.getInputRecord as jest.Mock).mockResolvedValue({ data: record() });
        const data = await collectReport({ dataset: 'inputRecord', format: 'pdf', cropId: 'c1', sections: ALL_SECTIONS, language: 'hi' });
        expect(data.meta.documentTitle).toBe('चक्र इनपुट रिकॉर्ड');
        expect(JSON.stringify(data)).toContain('Neerani में कोई एंटीमाइक्रोबियल');
    });
});
