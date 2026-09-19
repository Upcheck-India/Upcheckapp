import { preHarvestLines, type CheckInput } from '../preHarvestCheck';
import type { MoltWindow } from '../moltWindow';

// pre 25–26, peak 27–29, post 30 Sep–1 Oct.
const W: MoltWindow = {
    key: '2026-09-28-full', kind: 'full',
    preStart: '2026-09-25', peakStart: '2026-09-27', peakDate: '2026-09-28', peakEnd: '2026-09-29', postEnd: '2026-10-01',
};
const obs = (observedOn: string, level: 'none' | 'few' | 'many', extra: any = {}) =>
    ({ id: observedOn + level, sign: 'soft_shell', level, observedOn, createdAt: `${observedOn}T08:00:00Z`, count: null, sampleSize: null, ...extra }) as any;
const lines = (over: Partial<CheckInput>) =>
    preHarvestLines({ date: '2026-09-20', windows: [W], fmt: (d) => d, ...over }).map((l) => `${l.key}:${l.tone}:${l.text}`);

describe('preHarvestLines', () => {
    it('all clean → one green "Ready to harvest"', () => {
        expect(lines({})).toEqual(['ready:green:ready']);
    });

    it('molt: peak and post days warn; a pre day does not', () => {
        expect(lines({ date: '2026-09-28', observations: [obs('2026-09-27', 'none')] })).toEqual(['molt:amber:moltPeak', 'soft:green:softFirm']);
        expect(lines({ date: '2026-09-30', observations: [obs('2026-09-29', 'few')] })).toEqual(['molt:amber:moltPost', 'soft:green:softFirm']);
        expect(lines({ date: '2026-09-25', observations: [obs('2026-09-25', 'none')] })).toEqual(['ready:green:ready']);
    });

    it('soft shells: latest in the last 3 days wins; many is amber with counts', () => {
        const out = preHarvestLines({
            date: '2026-09-20', windows: [W], fmt: (d) => d,
            observations: [obs('2026-09-17', 'none'), obs('2026-09-18', 'many', { count: 6, sampleSize: 50 })],
        });
        expect(out).toEqual([{ key: 'soft', tone: 'amber', text: 'softMany', params: { date: '2026-09-18', count: 6, of: 50 } }]);
        // Harvest rejections carry no counts.
        expect(lines({ observations: [obs('2026-09-19', 'many')] })).toEqual(['soft:amber:softManyNoCount']);
    });

    it('soft shells: an observation older than 3 days, or of another sign, does not count', () => {
        expect(lines({ observations: [obs('2026-09-16', 'many'), { ...obs('2026-09-20', 'many'), sign: 'red_body' }] })).toEqual(['ready:green:ready']);
    });

    it('no observation in or within 3 days after a window → the cast-net prompt; outside → nothing', () => {
        const prompt = preHarvestLines({ date: '2026-10-04', windows: [W], fmt: (d) => d });
        expect(prompt).toEqual([{ key: 'soft', tone: 'amber', text: 'softPrompt', prompt: true }]);
        expect(lines({ date: '2026-09-26' })).toEqual(['soft:amber:softPrompt']);
        expect(lines({ date: '2026-10-05' })).toEqual(['ready:green:ready']);
    });

    const item = (flag: 'banned' | 'restricted', date: string, substances: string[]) =>
        ({ date, source: 'treatment', recordId: date, substances, flag }) as const;

    it('residues: banned is red and beats restricted', () => {
        const out = preHarvestLines({
            date: '2026-09-20', fmt: (d) => d,
            compliance: { status: 'banned_logged', listVersion: 'v', evaluatedAt: '', items: [item('restricted', '2026-09-01', ['Oxytetracycline']), item('banned', '2026-08-12T00:00:00Z', ['Chloramphenicol'])] },
        });
        expect(out).toEqual([{ key: 'residues', tone: 'red', text: 'banned', params: { substances: 'Chloramphenicol', date: '2026-08-12' } }]);
    });

    it('residues: restricted without a sourced period says "confirm with your processor" — never a number', () => {
        const out = preHarvestLines({
            date: '2026-09-20', fmt: (d) => d,
            compliance: { status: 'restricted_logged', listVersion: 'v', evaluatedAt: '', items: [item('restricted', '2026-08-12', ['Oxytetracycline'])] },
            ingredients: [{ key: 'otc', bannedKey: 'oxytetracycline', category: 'antimicrobial', aliases: [], names: {} as any }],
        });
        expect(out).toEqual([{ key: 'residues', tone: 'amber', text: 'restricted', params: { substances: 'Oxytetracycline', date: '2026-08-12' } }]);
    });

    it('residues: a SOURCED withdrawal period is computed', () => {
        const out = preHarvestLines({
            date: '2026-09-20', fmt: (d) => d,
            compliance: { status: 'restricted_logged', listVersion: 'v', evaluatedAt: '', items: [item('restricted', '2026-08-12', ['Oxytetracycline'])] },
            ingredients: [{
                key: 'otc', bannedKey: 'oxytetracycline', category: 'antimicrobial', aliases: [], names: {} as any,
                withdrawalDays: { value: 22, source: { instrument: 'CAA 2024', url: 'https://example.org' } },
            }],
        });
        expect(out[0]).toEqual({
            key: 'residues', tone: 'amber', text: 'withdrawal',
            params: { substance: 'Oxytetracycline', date: '2026-08-12', until: '2026-09-03', source: 'CAA 2024' },
        });
    });

    it('never more than three lines', () => {
        const out = preHarvestLines({
            date: '2026-09-28', windows: [W], fmt: (d) => d,
            observations: [obs('2026-09-27', 'many')],
            compliance: { status: 'banned_logged', listVersion: 'v', evaluatedAt: '', items: [item('banned', '2026-08-12', ['X'])] },
        });
        expect(out.map((l) => l.key)).toEqual(['molt', 'soft', 'residues']);
    });
});
