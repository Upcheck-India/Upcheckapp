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

const get = apiClient.get as jest.Mock;
/** What GET /consents/me returns for the signed-in user. */
const serverHas = (rows: Array<{ kind: string; docVersion: string }>) => get.mockResolvedValue({ data: rows });
const OLD = [
    { kind: 'terms', docVersion: '2026-01-01' },
    { kind: 'privacy', docVersion: '2026-01-01' },
];
const CURRENT = [
    { kind: 'terms', docVersion: LEGAL_VERSION },
    { kind: 'privacy', docVersion: LEGAL_VERSION },
];

beforeEach(async () => {
    await AsyncStorage.clear();
    save.mockClear();
    save.mockResolvedValue({ queued: false });
    get.mockReset();
    serverHas([]);
});

describe('sign-up consent (C2.1)', () => {
    it('a new account that read the notice: terms + privacy recorded silently, with version and locale', async () => {
        await acknowledgeDataNotice('en');
        expect(await settleLegalConsent('u1')).toBe('none');
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0].endpoint).toBe('/consents');
        expect(rowsOf(0)).toEqual([
            expect.objectContaining({ kind: 'terms', granted: true, docVersion: LEGAL_VERSION, locale: 'en', source: 'signup' }),
            expect.objectContaining({ kind: 'privacy', granted: true, docVersion: LEGAL_VERSION, locale: 'en', source: 'signup' }),
        ]);
        // Settled: a relaunch neither re-records nor shows anything.
        expect(await settleLegalConsent('u1')).toBe('none');
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('a new account that skipped the notice (Login → OTP/Truecaller) gets the NOTICE sheet, recorded as signup', async () => {
        expect(await settleLegalConsent('otp-user')).toBe('notice');
        await acceptPolicyUpdate('otp-user', 'en', 'signup');
        expect(rowsOf(0).map((r: any) => [r.kind, r.source])).toEqual([
            ['terms', 'signup'],
            ['privacy', 'signup'],
        ]);
        expect(await settleLegalConsent('otp-user')).toBe('none');
    });

    it('a NEW account on a phone where another user already accepted still gets the sheet', async () => {
        serverHas(CURRENT);
        expect(await settleLegalConsent('first')).toBe('none');
        serverHas([]);
        expect(await settleLegalConsent('second')).toBe('notice');
    });
});

describe('"what changed" sheet', () => {
    it('an account with older-version rows gets "update"; Continue records reconsent; then settled', async () => {
        serverHas(OLD);
        expect(await settleLegalConsent('u2')).toBe('update');
        await acceptPolicyUpdate('u2', 'en');
        expect(rowsOf(0).map((r: any) => [r.kind, r.source, r.docVersion])).toEqual([
            ['terms', 'reconsent', LEGAL_VERSION],
            ['privacy', 'reconsent', LEGAL_VERSION],
        ]);
        expect(await settleLegalConsent('u2')).toBe('none');
    });

    it('the server already has current-version rows (reinstall, second phone) → nothing shown, nothing written', async () => {
        serverHas(CURRENT);
        expect(await settleLegalConsent('u3')).toBe('none');
        expect(save).not.toHaveBeenCalled();
    });

    it('only ONE current-version kind on the server is not enough', async () => {
        serverHas([OLD[0], CURRENT[1]]);
        expect(await settleLegalConsent('u3b')).toBe('update');
    });

    it('acceptance of an older version on this device does not settle the new one', async () => {
        await AsyncStorage.setItem('upcheck-legal-accepted:u5:2000-01-01', '1');
        serverHas(OLD);
        expect(await settleLegalConsent('u5')).toBe('update');
    });

    it('is per user: one user accepting does not settle another on the same device', async () => {
        await acceptPolicyUpdate('a', 'en');
        serverHas(OLD);
        expect(await settleLegalConsent('b')).toBe('update');
    });
});

describe('offline', () => {
    beforeEach(() => get.mockRejectedValue(new Error('Network Error')));

    it('falls back to the per-user device flag', async () => {
        expect(await settleLegalConsent('u4')).toBe('update');
        save.mockResolvedValue({ queued: true });
        await acceptPolicyUpdate('u4', 'en');
        expect(await settleLegalConsent('u4')).toBe('none');
    });

    it('a sign-up that just read the notice is still recorded, queued', async () => {
        await acknowledgeDataNotice('en');
        expect(await settleLegalConsent('u6')).toBe('none');
        expect(rowsOf(0)[0].source).toBe('signup');
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
