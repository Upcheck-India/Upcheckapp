// D7 — disease alerts render from backend keys, and `disease_alert_raised`
// carries only the disease code + level, once per pond/disease/level.
const mockCapture = jest.fn();
jest.mock('../../features/analytics', () => ({
    ...jest.requireActual('../../features/analytics'),
    capture: (...args: unknown[]) => mockCapture(...args),
}));

import i18n from '../../i18n';
import { localizeLiveAlert, reportDiseaseAlerts, type LiveAlert } from '../alertCenter';
import { EVENTS, sanitizeProps } from '../../features/analytics';

const live: LiveAlert = {
    key: 'disease:p1:WSSV', pondId: 'p1', farmId: 'f1', source: 'disease', severity: 'critical',
    title: 'White spot (WSSV)', body: 'Critical risk · based on 9 of 23 signs', steps: ['Raise biosecurity'],
    titleKey: { key: 'engines.disease.name_WSSV' },
    bodyKey: { key: 'engines.disease.alertBody_critical', params: { known: 9, total: 23 } },
    stepKeys: [{ key: 'engines.disease.step_WSSV_0' }],
};

afterEach(async () => {
    await i18n.changeLanguage('en');
});

describe('disease alerts (D7)', () => {
    it('localises name, body and steps', async () => {
        await i18n.changeLanguage('te');
        const out = localizeLiveAlert(live);
        expect(out.title).toBe('తెల్ల మచ్చ (WSSV)');
        expect(out.body).toContain('23');
        expect(out.body).not.toBe(live.body);
        expect(out.steps[0]).not.toBe(live.steps[0]);
    });

    it('every trigger and step key the backend can send exists in English', () => {
        const keys = [
            'tempDrop3in48h', 'doBelow4', 'seasonWinter', 'redBody', 'entryRisk_prep', 'entryRisk_not_tested',
            'entryRisk_positive', 'docBelow35', 'yellowVibrioUp', 'emptyGut', 'paleHp', 'sizeCvUp',
            'adgBelowExpected', 'whiteFecesTray', 'vibrioUp', 'ehpRiskUp', 'luminousVibrioUp', 'nightGlow',
            'chronicDailyMortality', 'multiStress', 'looseShellObs', 'mineralDeficit',
        ];
        for (const k of keys) expect(i18n.exists(`engines.disease.why_${k}`)).toBe(true);
        const steps: Record<string, number> = { WSSV: 3, AHPND: 3, EHP: 3, WFD: 2, Luminous: 2, RMS: 2, LSS: 2 };
        for (const [d, n] of Object.entries(steps)) {
            for (let i = 0; i < n; i++) expect(i18n.exists(`engines.disease.step_${d}_${i}`)).toBe(true);
            expect(i18n.exists(`engines.disease.name_${d}`)).toBe(true);
        }
    });

    it('disease_alert_raised: disease + level only, once per pond/disease/level', () => {
        reportDiseaseAlerts([live, live, { ...live, source: 'water' }]);
        reportDiseaseAlerts([{ ...live, pondId: 'p2' }, { ...live, severity: 'watch' }]);
        expect(mockCapture.mock.calls).toEqual([
            [EVENTS.DISEASE_ALERT_RAISED, { kind: 'WSSV', severity: 'critical' }],
            [EVENTS.DISEASE_ALERT_RAISED, { kind: 'WSSV', severity: 'critical' }],
            [EVENTS.DISEASE_ALERT_RAISED, { kind: 'WSSV', severity: 'watch' }],
        ]);
        expect(JSON.stringify(mockCapture.mock.calls)).not.toContain('p1');
    });

    it('severity is allowlisted; anything else is still dropped', () => {
        expect(sanitizeProps({ kind: 'WSSV', severity: 'critical', pondId: 'p1' } as any)).toEqual({ kind: 'WSSV', severity: 'critical' });
    });
});
