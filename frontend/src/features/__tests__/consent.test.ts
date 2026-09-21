let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));
jest.mock('../../sync/recordSync', () => ({ saveRecord: jest.fn().mockResolvedValue({ queued: false }) }));
jest.mock('../../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../i18n', () => ({ __esModule: true, default: { language: 'hi' } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveRecord } from '../../sync/recordSync';
import apiClient from '../../api/client';
import { LEGAL_VERSION } from '../../legal/content';
import { dataNoticeFor, mlTrainingNoticeFor } from '../../legal/dataNotice';
import {
    acceptPolicyUpdate,
    acknowledgeDataNotice,
    loadTrainingPrefs,
    recordConsent,
    refreshTrainingPrefs,
    setTrainingConsent,
    settleLegalConsent,
} from '../consent';

const save = saveRecord as jest.Mock;
const rowsOf = (call: number) => save.mock.calls[call][0].payload.consents;

beforeEach(async () => {
    await AsyncStorage.clear();
    save.mockClear();
    save.mockResolvedValue({ queued: false });
});

describe('sign-up consent (C2.1)', () => {
    it('writes terms + privacy with the version and the language the notice was shown in', async () => {
        await acknowledgeDataNotice('en');
        expect(await settleLegalConsent('u1')).toBe(false); // no sheet for a new account
        await Promise.resolve();
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0].endpoint).toBe('/consents');
        expect(rowsOf(0)).toEqual([
            expect.objectContaining({ kind: 'terms', granted: true, docVersion: LEGAL_VERSION, locale: 'en', source: 'signup' }),
            expect.objectContaining({ kind: 'privacy', granted: true, docVersion: LEGAL_VERSION, locale: 'en', source: 'signup' }),
        ]);
        // Settled: a relaunch neither re-records nor shows the sheet.
        expect(await settleLegalConsent('u1')).toBe(false);
        expect(save).toHaveBeenCalledTimes(1);
    });
});

describe('"what changed" sheet', () => {
    it('shows for an existing user once per version, and Continue records reconsent rows', async () => {
        expect(await settleLegalConsent('u2')).toBe(true);
        await acceptPolicyUpdate('u2', 'en');
        expect(rowsOf(0).map((r: any) => [r.kind, r.source, r.docVersion])).toEqual([
            ['terms', 'reconsent', LEGAL_VERSION],
            ['privacy', 'reconsent', LEGAL_VERSION],
        ]);
        expect(await settleLegalConsent('u2')).toBe(false);
    });

    it('shows again after the version is bumped', async () => {
        await AsyncStorage.setItem('upcheck-legal-accepted:u3', '2000-01-01');
        expect(await settleLegalConsent('u3')).toBe(true);
    });

    it('is per user: one user accepting does not settle another on the same device', async () => {
        await acceptPolicyUpdate('a', 'en');
        expect(await settleLegalConsent('b')).toBe(true);
    });

    it('works offline — accepting only needs device storage, the rows queue', async () => {
        save.mockResolvedValue({ queued: true });
        await acceptPolicyUpdate('u4', 'en');
        expect(await settleLegalConsent('u4')).toBe(false);
    });
});

describe('recording', () => {
    it('a Settings toggle APPENDS: on then off is two rows with distinct ids, never an edit', async () => {
        await recordConsent('analytics', true, 'settings');
        await recordConsent('analytics', false, 'settings');
        expect(save).toHaveBeenCalledTimes(2);
        for (const [args] of save.mock.calls) expect(args.method).toBeUndefined(); // POST
        const [a] = rowsOf(0);
        const [b] = rowsOf(1);
        expect(a.id).not.toBe(b.id);
        expect([a.granted, b.granted]).toEqual([true, false]); // the withdrawal is its own row
        expect(b.locale).toBe('hi'); // UI toggles record the UI language
    });

    it('never throws — a failed consent write must not block anything', async () => {
        save.mockRejectedValue(new Error('400'));
        await expect(recordConsent('crash', false, 'settings')).resolves.toBeUndefined();
    });
});

describe('model-training opt-in (C3)', () => {
    it('is off by default for both scopes', async () => {
        expect(await loadTrainingPrefs('u5')).toEqual({ records: false, photos: false });
    });

    it('records and photos are separate kinds, and switching off appends a withdrawal', async () => {
        await setTrainingConsent('u5', 'records', true, 'en');
        await setTrainingConsent('u5', 'records', false, 'en');
        await setTrainingConsent('u5', 'photos', true, 'en');
        expect(save.mock.calls.map((_, i) => [rowsOf(i)[0].kind, rowsOf(i)[0].granted])).toEqual([
            ['ml_training_records', true],
            ['ml_training_records', false],
            ['ml_training_photos', true],
        ]);
        expect(await loadTrainingPrefs('u5')).toEqual({ records: false, photos: true });
    });

    it('the server latest row wins after a reinstall; a kind without a row keeps the device value', async () => {
        await setTrainingConsent('u6', 'photos', true, 'en');
        (apiClient.get as jest.Mock).mockResolvedValue({
            data: [{ kind: 'ml_training_records', granted: true }],
        });
        expect(await refreshTrainingPrefs('u6')).toEqual({ records: true, photos: true });
    });
});

describe('data notice (C2.2)', () => {
    it('non-English locales fall back to English until a legal translation is added', () => {
        for (const lng of ['hi', 'ta', 'te', 'bn', 'or']) {
            const n = dataNoticeFor(lng);
            expect(n.locale).toBe('en');
            expect(n.sections).toBe(dataNoticeFor('en').sections);
            expect(mlTrainingNoticeFor(lng).locale).toBe('en');
        }
    });

    it('is non-empty and versioned in all six locales', () => {
        for (const lng of ['en', 'hi', 'ta', 'te', 'bn', 'or']) {
            const n = dataNoticeFor(lng);
            expect(n.version).toBe(LEGAL_VERSION);
            expect(n.sections.length).toBeGreaterThanOrEqual(6);
            for (const s of n.sections) expect(s.text.length).toBeGreaterThan(20);
        }
    });

    it('names the processors', () => {
        const who = dataNoticeFor('en').sections.find((s) => s.heading === 'Who it goes to')!.text;
        for (const p of ['Supabase', 'Render', 'Cloudflare R2', 'Sentry', 'PostHog', 'Expo', 'Brevo']) {
            expect(who).toContain(p);
        }
    });
});
