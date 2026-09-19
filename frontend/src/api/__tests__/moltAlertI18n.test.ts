// M1.6 — molt alerts and the playbook render from backend keys in the farmer's
// language; an older backend (no keys) or an unknown key keeps the English.
import i18n from '../../i18n';
import { localizeBriefing, localizeLiveAlert, type BriefingItem, type LiveAlert } from '../alertCenter';
import { playbookHeadline } from '../../screens/engines/LunarScreen';
import type { LunarPlaybook } from '../lunar';

const item: BriefingItem = {
    pondId: 'p1',
    topTitle: 'Molt peak — 2 actions pending',
    topSeverity: 'critical',
    source: 'lunar',
    steps: ['Cut feed 15–30% today (molt peak)', 'Handled during peak: check for soft-shell deaths for 2 days'],
    alertCount: 1,
    titleKey: { key: 'engines.lunar.alertTitle_peak', params: { count: 2 } },
    stepKeys: [{ key: 'engines.lunar.item_feed_cut' }, { key: 'engines.lunar.handledWatch' }],
};

afterEach(async () => {
    await i18n.changeLanguage('en');
});

describe('molt alert localisation', () => {
    it('English: plural title from the key, same steps', () => {
        expect(localizeBriefing(item)).toMatchObject({
            topTitle: 'Molt peak — 2 actions pending',
            steps: item.steps,
        });
        expect(localizeBriefing({ ...item, titleKey: { key: 'engines.lunar.alertTitle_peak', params: { count: 1 } } }).topTitle)
            .toBe('Molt peak — 1 action pending');
    });

    it('Tamil: title and every step translated, the em dash kept for grouping', async () => {
        await i18n.changeLanguage('ta');
        const out = localizeBriefing(item);
        expect(out.topTitle).toBe('மோல்ட் உச்சம் — 2 செயல்கள் நிலுவையில்');
        expect(out.steps).toEqual([
            'இன்று தீவனத்தை 15–30% குறைக்கவும் (தோலுரிப்பு உச்சம்)',
            'உச்சத்தின் போது கையாளப்பட்டது: 2 நாட்கள் மென்மையான ஓடு இறப்புகளை கவனிக்கவும்',
        ]);
    });

    it('no keys (older backend) or an unknown key → the English stands', async () => {
        await i18n.changeLanguage('hi');
        const { titleKey, stepKeys, ...old } = item;
        expect(localizeBriefing(old)).toEqual(old);
        const unknown = localizeBriefing({ ...item, titleKey: { key: 'engines.lunar.noSuchKey' }, stepKeys: [{ key: 'x.y' }, { key: 'x.z' }] });
        expect(unknown.topTitle).toBe(item.topTitle);
        expect(unknown.steps).toEqual(item.steps);
    });

    it('live alert body uses the moon key', async () => {
        await i18n.changeLanguage('hi');
        const live: LiveAlert = {
            key: 'k', pondId: 'p1', farmId: 'f1', source: 'lunar', severity: 'critical',
            title: item.topTitle, body: 'Full moon 2026-09-26', steps: [],
            titleKey: item.titleKey, bodyKey: { key: 'engines.lunar.windowFull', params: { date: '2026-09-26' } }, stepKeys: [],
        };
        expect(localizeLiveAlert(live).body).toBe('पूर्णिमा 2026-09-26');
    });

    it('playbook headline: key + params + critical suffix; English without keys', async () => {
        const pb = {
            phaseRel: 'pre', phaseLabel: 'Pre-molt — build reserves',
            headline: 'Molt surge expected in ~2 day(s) around the full moon. Build mineral and oxygen reserves now. Risk is CRITICAL — act today.',
            note: '', steps: [],
            headlineKey: 'engines.lunar.pb_headline_pre_full', headlineParams: { days: '2' }, headlineCritical: true,
        } as LunarPlaybook;
        expect(playbookHeadline(i18n.t.bind(i18n), pb)).toBe(pb.headline);
        await i18n.changeLanguage('te');
        expect(playbookHeadline(i18n.t.bind(i18n), pb)).toBe(
            'పౌర్ణమి చుట్టూ ~2 రోజుల్లో మోల్ట్ ఉధృతి ఉంటుంది. ఇప్పుడే ఖనిజ, ఆక్సిజన్ నిల్వలు పెంచండి. ప్రమాదం తీవ్రంగా ఉంది — ఈరోజే చర్య తీసుకోండి.',
        );
        const { headlineKey, ...old } = pb;
        expect(playbookHeadline(i18n.t.bind(i18n), old as LunarPlaybook)).toBe(pb.headline);
    });
});
