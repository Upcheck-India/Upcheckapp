/**
 * MorningRoundsScreen — every pond's water quality in one pass (L3 / D1).
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Quick mode cut each water-quality form from ten fields to three. Nobody cut
 * the number of FORMS. A four-pond farmer doing the morning round walks
 * QuickLog → pond picker → tile → form → save → back, four times over — around
 * 35–40 interactions — then does it again in the evening, plus feed.
 * Twice-daily dissolved oxygen is standard practice, not an edge case.
 *
 * This is where paper still wins, and not on field count: one notebook page
 * holds every pond in a single pass. Depth was fixed; breadth was not.
 *
 * Rows are ponds, columns are the quick-mode three. One Save.
 *
 * ── What this screen deliberately does NOT do ─────────────────────────────
 * It does not replace `WaterQualityLogScreen`, and it does not touch four of
 * that screen's five entry points. Once a farmer has navigated INTO a pond,
 * they have already answered "which pond" and a grid of every pond is the
 * wrong screen. The per-pond form remains right for one pond, for editing, and
 * for the full ten parameters behind "more".
 *
 * It also introduces NO sync machinery. One Save writes N records through the
 * existing `saveRecord`, each with its own client-minted UUID, so the queue's
 * idempotent replay carries it unchanged. N queued records is the correct
 * shape for a farmer who loses signal between pond two and pond three — a
 * batch endpoint would turn a partial success into a total failure.
 *
 * ── The rules carried over from the single-pond form ──────────────────────
 * These are what make the data honest, so they are not simplified away:
 *  • A blank row is NOT a record. Ponds left empty are skipped, never written
 *    as empties (L2) — the app must not count a pond as logged because the
 *    farmer opened a screen that mentioned it.
 *  • Warnings are per cell and never block the save (L4).
 *  • Partial failure is reported PER POND and the grid stays open with the
 *    failed rows intact. `PondNamesScreen` toasts a count and resets to Home
 *    with no retry path; repeating that here would lose a morning's readings.
 *
 * ── Speed, drafts, prefill ────────────────────────────────────────────────
 *  • Ponds save SAVE_POOL at a time, with a live "n of N" (was one by one
 *    behind a bare spinner — ten ponds was ten round trips end to end).
 *  • The grid is a draft until it lands — see features/roundsDraft.ts for the
 *    rules that stop a draft becoming a bug.
 *  • Empty cells prefill from each pond's last reading, but a copied value is
 *    NOT a reading: it counts only once edited or confirmed, and Save stops on
 *    a review sheet for any copied value the farmer left untouched.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { theme } from '../../theme';
import { saveRecord } from '../../sync/recordSync';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { pondsApi, type Pond } from '../../api/ponds';
import { fetchTodaySnapshot } from '../../api/todaySnapshot';
import { pondLabel } from '../../utils/pondHealth';
import { formatDate, formatTime } from '../../utils/formatDate';
import { isOutOfBounds } from '../../features/parameterBounds';
import { evaluateParameter, type ThresholdParam } from '../../features/waterQualityThresholds';
import {
    cellCounts,
    clearDraft,
    loadDraft,
    saveDraft,
    type Cell,
    type ColKey,
    type Row,
    type Rows,
} from '../../features/roundsDraft';
import { qk } from '../../query/client';
import { useAppQuery } from '../../query/hooks';

const c = theme.roles.light;

/**
 * Ponds in flight at once. Enough to hide most of a rural round trip, few
 * enough not to swamp the API's small DB pool or a weak uplink.
 */
export const SAVE_POOL = 4;
const DRAFT_DEBOUNCE_MS = 500;

/** The quick-mode three, in the order the farmer reads their meter. */
const COLUMNS: { key: ColKey; param: ThresholdParam; labelKey: string }[] = [
    { key: 'ph', param: 'ph', labelKey: 'logs.waterQuality_labelPh' },
    { key: 'dissolvedOxygen', param: 'do', labelKey: 'logs.waterQuality_labelDo' },
    { key: 'temperature', param: 'temperature', labelKey: 'logs.waterQuality_labelTemperature' },
];

type Pending = { pondId: string; key: ColKey; v: string; at: string };

/** A cell worth commenting on, and how loudly. */
const cellTone = (param: ThresholdParam, raw: string): 'none' | 'warn' | 'bad' => {
    if (!raw.trim()) return 'none';
    if (isOutOfBounds(param, raw)) return 'bad';
    const n = Number(raw);
    if (!Number.isFinite(n)) return 'none';
    const status = evaluateParameter('vannamei', param, n).status;
    return status === 'critical' || status === 'warning' ? 'warn' : 'none';
};

/** Copied values the farmer has neither changed nor confirmed. */
const unconfirmed = (cell: Cell | undefined): cell is Cell & { prefillAt: string } =>
    !!cell?.prefillAt && !cell.ok && cell.v.trim() !== '';

/** `fn` over `items`, at most `limit` in flight. `fn` must not reject. */
async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
    let next = 0;
    const worker = async () => {
        while (next < items.length) await fn(items[next++]);
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export const MorningRoundsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const userId = useAuthStore((s) => s.user?.id);

    // Same cached key QuickLog and Home already warm, so this opens instantly
    // and works offline — which is the whole point of a screen used standing
    // at a pond.
    const pondsQuery = useAppQuery({
        queryKey: qk.ponds(),
        queryFn: async () => (await pondsApi.getMine()).data,
    });
    const ponds: Pond[] = useMemo(() => pondsQuery.data ?? [], [pondsQuery.data]);
    const pondsLoaded = pondsQuery.data !== undefined;

    // Last readings come from the Today snapshot Home already holds — the
    // same key, so this is a cache hit, not a request per pond.
    const farmIds = useMemo(() => [...new Set(ponds.map((p) => p.farmId))], [ponds]);
    const snapshotQuery = useAppQuery({
        queryKey: [...qk.briefing(), 'home'],
        queryFn: () => fetchTodaySnapshot(farmIds),
        enabled: farmIds.length > 0,
    });
    const contexts = snapshotQuery.data?.contexts;

    const [rows, setRows] = useState<Rows>({});
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    /** Ponds whose write failed on the last attempt — kept on screen to retry. */
    const [failedPondIds, setFailedPondIds] = useState<string[]>([]);
    const [restoredAt, setRestoredAt] = useState<string | null>(null);
    const [review, setReview] = useState<Pending[] | null>(null);

    // ── Draft: restore once, then persist (debounced) until the round lands ──
    const draftReady = useRef(false);
    const done = useRef(false);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    useEffect(() => {
        if (!userId || !pondsLoaded || draftReady.current) return;
        let alive = true;
        loadDraft(userId, new Set(ponds.map((p) => p.id))).then((draft) => {
            if (!alive) return;
            draftReady.current = true;
            if (!draft) return;
            // Never restores over a row the farmer already started typing.
            setRows((prev) => {
                const next = { ...prev };
                for (const [id, row] of Object.entries(draft.rows)) {
                    if (!prev[id]?.editedAt) next[id] = row;
                }
                return next;
            });
            setRestoredAt(draft.savedAt);
        });
        return () => {
            alive = false;
        };
    }, [userId, pondsLoaded, ponds]);

    useEffect(() => {
        if (!draftReady.current || !userId || done.current) return;
        const h = setTimeout(() => {
            if (!done.current) void saveDraft(userId, rows);
        }, DRAFT_DEBOUNCE_MS);
        return () => clearTimeout(h);
    }, [rows, userId]);

    // Leaving the screen flushes whatever the debounce had not written yet.
    useEffect(
        () => () => {
            if (draftReady.current && userIdRef.current && !done.current) {
                void saveDraft(userIdRef.current, rowsRef.current);
            }
        },
        [],
    );

    // ── Prefill empty cells from each pond's last reading ──
    // Only into cells never touched (undefined) or still holding an older
    // unconfirmed copy: a value the farmer typed, cleared or confirmed stays.
    useEffect(() => {
        if (!contexts?.length) return;
        const known = new Set(ponds.map((p) => p.id));
        setRows((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const ctx of contexts) {
                const wq: Record<string, any> | null | undefined = ctx.waterQuality;
                if (!known.has(ctx.pondId) || !wq) continue;
                for (const col of COLUMNS) {
                    const value = wq[col.key];
                    const at = wq[`${col.key}AsOf`] ?? wq.recordedAt;
                    if (value == null || !at) continue;
                    const row = next[ctx.pondId] ?? { cells: {} };
                    const cur = row.cells[col.key];
                    if (cur !== undefined && !(unconfirmed(cur) && cur.prefillAt !== at)) continue;
                    next[ctx.pondId] = {
                        ...row,
                        cells: { ...row.cells, [col.key]: { v: String(value), prefillAt: at } },
                    };
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [contexts, ponds, rows]);

    const setCell = (pondId: string, key: ColKey, value: string) =>
        setRows((prev) => {
            const row = prev[pondId] ?? { cells: {} };
            // Typing makes it the farmer's own reading: no longer a prefill,
            // and a new record id (the old one belonged to other values).
            const { id: _drop, ...rest } = row;
            return {
                ...prev,
                [pondId]: {
                    ...rest,
                    cells: { ...row.cells, [key]: { v: value } },
                    editedAt: new Date().toISOString(),
                },
            };
        });

    /** Confirm copied values as today's readings. */
    const confirmCells = (prev: Rows, which: { pondId: string; key: ColKey }[]): Rows => {
        const next = { ...prev };
        const now = new Date().toISOString();
        for (const { pondId, key } of which) {
            const row = next[pondId];
            const cell = row?.cells[key];
            if (!row || !cell) continue;
            next[pondId] = {
                ...row,
                cells: { ...row.cells, [key]: { ...cell, ok: true } },
                editedAt: row.editedAt ?? now,
            };
        }
        return next;
    };

    const confirmRow = (pondId: string) =>
        setRows((prev) =>
            confirmCells(
                prev,
                COLUMNS.filter((col) => unconfirmed(prev[pondId]?.cells[col.key])).map((col) => ({
                    pondId,
                    key: col.key,
                })),
            ),
        );

    const clearPrefilled = () =>
        setRows((prev) => {
            const next: Rows = {};
            for (const [id, row] of Object.entries(prev)) {
                const cells = { ...row.cells };
                for (const col of COLUMNS) {
                    if (unconfirmed(cells[col.key])) cells[col.key] = { v: '' };
                }
                next[id] = { ...row, cells };
            }
            return next;
        });

    const discardDraft = () => {
        setRestoredAt(null);
        setRows({});
        setFailedPondIds([]);
        if (userId) void clearDraft(userId);
    };

    /** Ponds the farmer actually entered something for. A blank row is not a record. */
    const filledIn = (r: Rows) =>
        ponds
            .map((p) => p.id)
            .filter((id) => COLUMNS.some((col) => cellCounts(r[id]?.cells[col.key])));
    const filledPondIds = useMemo(() => filledIn(rows), [ponds, rows]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasPrefill = useMemo(
        () => Object.values(rows).some((r) => COLUMNS.some((col) => unconfirmed(r.cells[col.key]))),
        [rows],
    );

    // ── Keyboard: keep the focused row above it ──
    const scrollRef = useRef<ScrollView>(null);
    const rowY = useRef<Record<string, number>>({});
    const focusedPond = useRef<string | null>(null);
    const inputs = useRef<Record<string, TextInput | null>>({});

    const scrollToRow = useCallback((pondId: string | null) => {
        if (!pondId) return;
        const y = rowY.current[pondId];
        if (y === undefined) return;
        // A row of headroom above, so the farmer still sees the pond before.
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 64), animated: true });
    }, []);

    useEffect(() => {
        const sub = Keyboard.addListener('keyboardDidShow', () => scrollToRow(focusedPond.current));
        return () => sub.remove();
    }, [scrollToRow]);

    const onCellFocus = (pondId: string) => {
        focusedPond.current = pondId;
        scrollToRow(pondId);
    };

    // ── Save ──
    const onSavePress = () => {
        if (filledPondIds.length === 0 || busy) return;
        const pending: Pending[] = [];
        for (const pondId of filledPondIds) {
            for (const col of COLUMNS) {
                const cell = rows[pondId]?.cells[col.key];
                if (unconfirmed(cell)) pending.push({ pondId, key: col.key, v: cell.v, at: cell.prefillAt });
            }
        }
        // Nothing copied goes out unseen: stop and show every such value.
        if (pending.length > 0) {
            setReview(pending);
            return;
        }
        void save(rows);
    };

    const confirmReview = () => {
        if (!review) return;
        const next = confirmCells(rows, review);
        setReview(null);
        setRows(next);
        void save(next);
    };

    const editFromReview = (p: Pending) => {
        setReview(null);
        focusedPond.current = p.pondId;
        scrollToRow(p.pondId);
        setTimeout(() => inputs.current[`${p.key}-${p.pondId}`]?.focus(), 250);
    };

    const save = async (snapshot: Rows) => {
        const ids = filledIn(snapshot);
        if (ids.length === 0) return;
        setBusy(true);

        // Fix each record's id BEFORE sending, and write it into the draft: if
        // the app dies mid-save, the restored draft replays the same ids and
        // the server's idempotent insert keeps ponds that landed from doubling.
        const withIds: Rows = { ...snapshot };
        for (const id of ids) withIds[id] = { ...withIds[id], id: withIds[id].id ?? Crypto.randomUUID() };
        setRows(withIds);
        if (userId) await saveDraft(userId, withIds);

        const failed: string[] = [];
        let saved = 0;
        let queued = 0;
        let finished = 0;
        const pressedAt = new Date().toISOString();
        setProgress({ done: 0, total: ids.length });

        await runPool(ids, SAVE_POOL, async (pondId) => {
            const row = withIds[pondId];
            const payload: Record<string, unknown> = { pondId };
            for (const col of COLUMNS) {
                const cell = row.cells[col.key];
                if (!cellCounts(cell)) continue;
                const n = Number(cell!.v.trim());
                // A cell that is not a number at all is skipped rather than
                // sent as NaN, which would serialise to null and fail the
                // at-least-one-value guard for reasons the farmer cannot see.
                if (Number.isFinite(n)) payload[col.key] = n;
            }
            try {
                // Guard against a row of pure junk surviving the filter above.
                if (Object.keys(payload).length === 1) return;
                const res = await saveRecord({
                    entity: 'water_quality',
                    endpoint: '/water-quality',
                    // Stamped when it was READ, never when it drains: press
                    // time for a fresh grid, the typing time for a restored
                    // draft (restoring at 09:40 must not re-date a 06:10 DO).
                    payload: {
                        ...payload,
                        id: row.id,
                        recordedAt: row.restored && row.editedAt ? row.editedAt : pressedAt,
                    },
                });
                if (res.queued) queued += 1;
                else saved += 1;
            } catch {
                failed.push(pondId);
            } finally {
                finished += 1;
                setProgress({ done: finished, total: ids.length });
            }
        });

        setBusy(false);
        setProgress(null);
        setFailedPondIds(failed);

        if (failed.length > 0) {
            /**
             * Stay on the screen. The successful rows are cleared and the
             * failed ones are left exactly as typed, so the farmer retries
             * three ponds rather than re-walking four. The draft follows
             * (debounced effect): only the failed rows remain in it.
             */
            const keep: Rows = {};
            for (const id of failed) if (withIds[id]) keep[id] = withIds[id];
            setRows(keep);
            if (userId) void saveDraft(userId, keep);
            showToast({
                message: t('logs.roundsPartial', {
                    failed: failed.length,
                    saved: saved + queued,
                }),
                type: 'error',
            });
            return;
        }

        done.current = true;
        if (userId) await clearDraft(userId);
        showToast({
            message: queued > 0
                ? t('logs.roundsQueued', { count: queued + saved })
                : t('logs.roundsSaved', { count: saved }),
            type: 'success',
        });
        navigation.goBack();
    };

    const pondName = (id: string) => {
        const p = ponds.find((x) => x.id === id);
        return p ? pondLabel(p) : id;
    };
    const lastLabel = (at: string) => t('logs.roundsLast', { when: `${formatDate(at)} ${formatTime(at)}` });

    return (
        // The in-screen ScreenHeader stays put; only the grid + footer avoid
        // the keyboard. ScreenWrapper's own KeyboardAvoidingView does nothing
        // on Android, and the app is edge-to-edge there, so the keyboard used
        // to cover the lower ponds and the Save button.
        <ScreenWrapper scroll={false} padded={false} keyboardAvoiding={false}>
            <ScreenHeader
                eyebrow={t('logs.roundsEyebrow')}
                title={t('logs.roundsTitle')}
                onBack={() => navigation.goBack()}
                accessibilityBackLabel={t('common.back')}
            />

            {/*
              * Offset 0 is deliberate. The route has headerShown: false, so
              * there is no stack header above this screen; the ScreenHeader
              * sits ABOVE this view inside the same full-screen parent, and
              * KeyboardAvoidingView measures its own frame from that parent —
              * the header height is already in frame.y. Adding it again would
              * lift the grid by a header's worth too much.
              */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
                testID="rounds-kav"
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.body}
                    keyboardShouldPersistTaps="handled"
                    testID="rounds-scroll"
                >
                    {restoredAt !== null && (
                        <View style={styles.banner} testID="rounds-draft-banner">
                            <Text style={styles.bannerText}>
                                {t('logs.roundsDraftRestored', { time: formatTime(restoredAt) })}
                            </Text>
                            <TouchableOpacity onPress={discardDraft} accessibilityRole="button" testID="rounds-draft-discard">
                                <Text style={styles.link}>{t('logs.roundsDraftDiscard')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.lead}>{t('logs.roundsLead')}</Text>

                    {hasPrefill && (
                        <View style={styles.prefillBar}>
                            <Text style={styles.prefillHint}>{t('logs.roundsPrefillHint')}</Text>
                            <TouchableOpacity onPress={clearPrefilled} accessibilityRole="button" testID="rounds-clear-prefilled">
                                <Text style={styles.link}>{t('logs.roundsClearPrefilled')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.headRow}>
                        <Text style={[styles.headCell, styles.pondCol]}>{t('logs.roundsPond')}</Text>
                        {COLUMNS.map((col) => (
                            <Text key={col.key} style={[styles.headCell, styles.valueCol]}>
                                {t(col.labelKey)}
                            </Text>
                        ))}
                    </View>

                    {ponds.map((pond) => {
                        const row = rows[pond.id];
                        const didFail = failedPondIds.includes(pond.id);
                        const rowHasPrefill = COLUMNS.some((col) => unconfirmed(row?.cells[col.key]));
                        return (
                            <View
                                key={pond.id}
                                style={[styles.row, didFail && styles.rowFailed]}
                                testID={`rounds-row-${pond.id}`}
                                onLayout={(e) => {
                                    rowY.current[pond.id] = e.nativeEvent.layout.y;
                                }}
                            >
                                <View style={styles.pondCol}>
                                    <Text style={styles.pondName} numberOfLines={2}>
                                        {pondLabel(pond)}
                                    </Text>
                                    {rowHasPrefill && (
                                        <TouchableOpacity
                                            onPress={() => confirmRow(pond.id)}
                                            accessibilityRole="button"
                                            testID={`rounds-confirm-${pond.id}`}
                                        >
                                            <Text style={styles.link}>{t('logs.roundsConfirmRow')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {COLUMNS.map((col) => {
                                    const cell = row?.cells[col.key];
                                    const raw = cell?.v ?? '';
                                    const copied = unconfirmed(cell);
                                    const tone = copied ? 'none' : cellTone(col.param, raw);
                                    return (
                                        <View key={col.key} style={styles.valueCol}>
                                            <TextInput
                                                ref={(r) => {
                                                    inputs.current[`${col.key}-${pond.id}`] = r;
                                                }}
                                                value={raw}
                                                onChangeText={(v) => setCell(pond.id, col.key, v)}
                                                onFocus={() => onCellFocus(pond.id)}
                                                // A copied value is replaced by typing, not appended to.
                                                selectTextOnFocus={copied}
                                                keyboardType="decimal-pad"
                                                placeholder="—"
                                                placeholderTextColor={c.textDisabled}
                                                style={[
                                                    styles.cell,
                                                    copied && styles.cellPrefill,
                                                    tone === 'warn' && styles.cellWarn,
                                                    tone === 'bad' && styles.cellBad,
                                                ]}
                                                testID={`rounds-${col.key}-${pond.id}`}
                                                accessibilityLabel={`${pondLabel(pond)} — ${t(col.labelKey)}`}
                                                accessibilityHint={copied ? lastLabel(cell!.prefillAt!) : undefined}
                                            />
                                            {copied && (
                                                <Text style={styles.lastText} numberOfLines={1}>
                                                    {lastLabel(cell!.prefillAt!)}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}

                    {/*
                      * Said once, under the grid, rather than per cell: a warning
                      * beside every reading in a crisis is noise, and none of them
                      * stop the save anyway (D3).
                      */}
                    <Text style={styles.note}>{t('logs.roundsNote')}</Text>
                </ScrollView>

                <View style={styles.footer}>
                    {failedPondIds.length > 0 && (
                        <View style={styles.failRow}>
                            <Icon name="warning" size={18} color={c.dangerText} />
                            <Text style={styles.failText}>{t('logs.roundsRetryHint')}</Text>
                        </View>
                    )}
                    <Button
                        title={
                            progress
                                ? t('logs.roundsSaving', { done: progress.done, total: progress.total })
                                : filledPondIds.length > 0
                                    ? t('logs.roundsSaveN', { count: filledPondIds.length })
                                    : t('logs.roundsSave')
                        }
                        onPress={onSavePress}
                        // A blank grid writes nothing (L2). Ponds left empty are
                        // skipped, so "save" with nothing typed is a no-op worth
                        // preventing rather than performing.
                        disabled={busy || filledPondIds.length === 0}
                    />
                </View>
            </KeyboardAvoidingView>

            <Modal visible={review !== null} transparent animationType="slide" onRequestClose={() => setReview(null)}>
                <View style={styles.sheetBackdrop}>
                    <View style={styles.sheet} testID="rounds-review">
                        <Text style={styles.sheetTitle}>{t('logs.roundsReviewTitle')}</Text>
                        <Text style={styles.sheetBody}>{t('logs.roundsReviewBody')}</Text>
                        <ScrollView style={styles.sheetList}>
                            {(review ?? []).map((p) => {
                                const col = COLUMNS.find((x) => x.key === p.key)!;
                                return (
                                    <View key={`${p.pondId}-${p.key}`} style={styles.sheetItem}>
                                        <View style={styles.flex}>
                                            <Text style={styles.pondName}>
                                                {pondName(p.pondId)} · {t(col.labelKey)} {p.v}
                                            </Text>
                                            <Text style={styles.lastText}>{lastLabel(p.at)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => editFromReview(p)}
                                            accessibilityRole="button"
                                            testID={`rounds-review-edit-${p.key}-${p.pondId}`}
                                        >
                                            <Text style={styles.link}>{t('logs.roundsReviewEdit')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>
                        <Button title={t('logs.roundsReviewConfirm')} onPress={confirmReview} />
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    body: { padding: theme.spacing[4], paddingBottom: theme.spacing[8] },
    lead: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginBottom: theme.spacing[4] },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: theme.spacing[3],
        marginBottom: theme.spacing[3],
        borderRadius: theme.radius.sm,
        backgroundColor: c.warningBg,
    },
    bannerText: { ...theme.typeScale.bodySmall, color: c.textPrimary, flex: 1 },
    prefillBar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
    prefillHint: { ...theme.typeScale.bodySmall, color: c.warningText, flex: 1 },
    link: { ...theme.typeScale.labelMedium, color: c.primary, paddingVertical: theme.spacing[1] },
    headRow: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    headCell: { ...theme.typeScale.labelSmall, color: c.textTertiary, textAlign: 'center' },
    pondCol: { width: 88, textAlign: 'left' },
    valueCol: { flex: 1 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[2],
        borderTopWidth: 1,
        borderTopColor: c.borderDefault,
    },
    rowFailed: { backgroundColor: c.dangerBg },
    pondName: { ...theme.typeScale.labelMedium, color: c.textPrimary },
    cell: {
        minHeight: 44,
        paddingHorizontal: theme.spacing[2],
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: c.borderDefault,
        backgroundColor: c.surface,
        ...theme.typeScale.bodyMedium,
        color: c.textPrimary,
        textAlign: 'center',
    },
    // Copied, not yet the farmer's: amber and muted until edited or confirmed.
    cellPrefill: { borderColor: c.warningBorder, backgroundColor: c.warningBg, color: c.textTertiary, borderStyle: 'dashed' },
    cellWarn: { borderColor: c.warningBorder },
    cellBad: { borderColor: c.dangerBorder },
    lastText: { ...theme.typeScale.labelSmall, color: c.warningText, textAlign: 'center', marginTop: 2 },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[4] },
    footer: {
        padding: theme.spacing[4],
        borderTopWidth: 1,
        borderTopColor: c.borderDefault,
        gap: theme.spacing[2],
        backgroundColor: c.background,
    },
    failRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
    failText: { ...theme.typeScale.bodySmall, color: c.dangerText, flex: 1 },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        backgroundColor: c.surface,
        padding: theme.spacing[4],
        gap: theme.spacing[3],
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        maxHeight: '80%',
    },
    sheetTitle: { ...theme.typeScale.h2, color: c.textPrimary },
    sheetBody: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    sheetList: { flexGrow: 0 },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[2],
        borderTopWidth: 1,
        borderTopColor: c.borderDefault,
    },
});

export default MorningRoundsScreen;
