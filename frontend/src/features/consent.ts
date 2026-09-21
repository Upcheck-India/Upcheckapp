/**
 * Consent that can be proven (spec 2026-09-20 C2.1, C3).
 *
 * Every consent — terms and privacy at sign-up or after a policy change,
 * analytics, crash reporting, model training — is written as a NEW row to
 * POST /consents, with the policy version and the language it was shown in.
 * Append-only: a withdrawal is another row with granted=false, never an edit.
 *
 * Rows go through `saveRecord()` — client-minted ids, queued when offline or
 * on a network error, replayed idempotently. A consent write must NEVER block
 * the farmer: every function here swallows its own failures. Device storage
 * stays the working copy (telemetryPrefs for analytics/crash, the keys below
 * for the rest); the server row is the audit copy.
 */
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '../i18n';
import apiClient from '../api/client';
import { LEGAL_VERSION } from '../legal/content';
import { useSyncStore } from '../store/syncStore';

/** Mirrors backend/src/consents/consent-kinds.ts — change both together. */
export type ConsentKind =
    | 'terms'
    | 'privacy'
    | 'analytics'
    | 'crash'
    | 'ml_training_records'
    | 'ml_training_photos';
export type ConsentSource = 'signup' | 'settings' | 'reconsent';

export interface ConsentRow {
    id: string;
    kind: ConsentKind;
    granted: boolean;
    docVersion: string;
    locale: string;
    source: ConsentSource;
}

/** Fresh rows, each with its own id — so a second toggle is a second row. */
export const buildConsentRows = (
    kinds: ConsentKind[],
    granted: boolean,
    source: ConsentSource,
    locale: string = i18n.language || 'en',
): ConsentRow[] =>
    kinds.map((kind) => ({
        id: Crypto.randomUUID(),
        kind,
        granted,
        docVersion: LEGAL_VERSION,
        locale,
        source,
    }));

/** Append rows. Never throws. */
export async function recordConsents(rows: ConsentRow[]): Promise<void> {
    if (!rows.length) return;
    try {
        // Required here, not at the top: RootNavigator imports this module on
        // the startup path, and recordSync drags analytics + notifications in.
        const { saveRecord } = require('../sync/recordSync') as typeof import('../sync/recordSync');
        await saveRecord({ entity: 'consent', endpoint: '/consents', payload: { consents: rows } });
    } catch (e) {
        console.warn('[Consent] Could not record consent', e);
    }
}

export const recordConsent = (
    kind: ConsentKind,
    granted: boolean,
    source: ConsentSource,
    locale?: string,
): Promise<void> => recordConsents(buildConsentRows([kind], granted, source, locale));

// ── Terms + privacy: sign-up and the "what changed" sheet ─────────────────────

/** Set BEFORE an account exists, when the data notice is acknowledged. */
const NOTICE_ACK_KEY = 'upcheck-data-notice-ack';
const acceptedKey = (userId: string) => `upcheck-legal-accepted:${userId}`;

/** The pre-account data notice was read (C2.2). Remembers its language. */
export async function acknowledgeDataNotice(locale: string): Promise<void> {
    try {
        await AsyncStorage.setItem(NOTICE_ACK_KEY, JSON.stringify({ version: LEGAL_VERSION, locale }));
    } catch {
        /* the notice was still shown; worst case the user sees the sheet later */
    }
}

/**
 * Run once a user is signed in. Returns true when the "what changed" sheet
 * must be shown.
 *
 * - Already accepted this version on this device → nothing.
 * - Came through the data notice in the sign-up flow → record terms + privacy
 *   with source 'signup', in the language the notice was shown in.
 * - Otherwise (an existing account, or a sign-in path that skips the notice)
 *   → show the sheet.
 *
 * Local only, so it works offline. Unreadable storage returns false: a
 * broken disk must never trap anyone behind a sheet.
 *
 * ponytail: the "already accepted" check is per device, so a second phone
 * shows the sheet once more (one tap, one more row). Consult GET /consents/me
 * here if that ever matters.
 */
export async function settleLegalConsent(userId: string): Promise<boolean> {
    try {
        if ((await AsyncStorage.getItem(acceptedKey(userId))) === LEGAL_VERSION) return false;
        const raw = await AsyncStorage.getItem(NOTICE_ACK_KEY);
        const ack = raw ? JSON.parse(raw) : null;
        if (ack?.version === LEGAL_VERSION) {
            await AsyncStorage.setItem(acceptedKey(userId), LEGAL_VERSION);
            await AsyncStorage.removeItem(NOTICE_ACK_KEY);
            void recordConsents(buildConsentRows(['terms', 'privacy'], true, 'signup', ack.locale || 'en'));
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

/** Continue on the "what changed" sheet. `locale` = language the changes were shown in. */
export async function acceptPolicyUpdate(userId: string, locale: string): Promise<void> {
    try {
        await AsyncStorage.setItem(acceptedKey(userId), LEGAL_VERSION);
    } catch {
        /* recorded server-side below regardless */
    }
    await recordConsents(buildConsentRows(['terms', 'privacy'], true, 'reconsent', locale));
}

// ── Model training opt-in (C3) ────────────────────────────────────────────────

export type TrainingScope = 'records' | 'photos';
export interface TrainingPrefs {
    records: boolean;
    photos: boolean;
}
/** Off unless switched on. Never inferred. */
export const DEFAULT_TRAINING_PREFS: TrainingPrefs = { records: false, photos: false };

const trainingKey = (userId: string) => `upcheck-ml-consent:${userId}`;
const KIND: Record<TrainingScope, ConsentKind> = {
    records: 'ml_training_records',
    photos: 'ml_training_photos',
};

export async function loadTrainingPrefs(userId: string): Promise<TrainingPrefs> {
    try {
        const raw = await AsyncStorage.getItem(trainingKey(userId));
        const p = raw ? JSON.parse(raw) : null;
        return { records: p?.records === true, photos: p?.photos === true };
    } catch {
        return DEFAULT_TRAINING_PREFS;
    }
}

/**
 * The server's latest row wins over the device copy — after a reinstall or on
 * a second phone, the device must not show "off" while the record says "on".
 * Skipped while a consent write is still queued (the device is newer then),
 * and a kind the server has no row for keeps the device value.
 */
export async function refreshTrainingPrefs(userId: string): Promise<TrainingPrefs | null> {
    if (useSyncStore.getState().queue.some((op) => op.entity === 'consent')) return null;
    try {
        const { data } = await apiClient.get<Array<{ kind: string; granted: boolean }>>('/consents/me');
        const local = await loadTrainingPrefs(userId);
        const latest = (scope: TrainingScope) => {
            const row = data?.find((r) => r.kind === KIND[scope]);
            return row ? row.granted === true : local[scope];
        };
        const prefs = { records: latest('records'), photos: latest('photos') };
        await AsyncStorage.setItem(trainingKey(userId), JSON.stringify(prefs));
        return prefs;
    } catch {
        return null;
    }
}

/** A switch flip: device copy first, then a NEW consent row. */
export async function setTrainingConsent(
    userId: string,
    scope: TrainingScope,
    granted: boolean,
    locale: string,
): Promise<TrainingPrefs> {
    const next = { ...(await loadTrainingPrefs(userId)), [scope]: granted };
    try {
        await AsyncStorage.setItem(trainingKey(userId), JSON.stringify(next));
    } catch {
        /* the server row below is still written */
    }
    await recordConsent(KIND[scope], granted, 'settings', locale);
    return next;
}
