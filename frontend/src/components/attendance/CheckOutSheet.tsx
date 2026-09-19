/**
 * Check someone out at a chosen time (spec 2026-09-14 attendance B.6), or fix
 * your own forgotten check-out (B.3).
 *
 * `personName` set = an owner/manager acting on a member: a reason is required.
 * Unset = the caller's own record: no reason is sent (the server records `self`).
 *
 * The time can only ever be inside [check-in, now]: the stepper clamps, so an
 * invalid time is not something the farmer can build. Direct call, not queued,
 * like own check-out.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipGroup } from '../ui/ChipGroup';
import { theme } from '../../theme';
import { attendanceApi, type AttendanceRecord, type ManagerCheckOutReason } from '../../api/attendance';
import { apiErrorMessage } from '../../api/errors';
import { invalidateForEntity } from '../../query/client';
import { formatTime, formatWeekday } from '../../utils/formatDate';
import { expectedEnd, formatDuration, type ShiftFarm, type TFn } from '../../features/attendance/shiftState';

const c = theme.roles.light;

type TimeOption = 'now' | 'shiftEnd' | 'pick';
const REASONS: ManagerCheckOutReason[] = ['forgot', 'left_early', 'shift_end', 'other'];
const STEPS = [
    { key: 'attendance.stepBackHour', ms: -3_600_000 },
    { key: 'attendance.stepBackQuarter', ms: -900_000 },
    { key: 'attendance.stepFwdQuarter', ms: 900_000 },
    { key: 'attendance.stepFwdHour', ms: 3_600_000 },
] as const;

interface Props {
    /** null = closed. */
    record: AttendanceRecord | null;
    farmName: string;
    farm?: ShiftFarm | null;
    personName?: string;
    onClose: () => void;
    /** After a successful check-out (the team/home queries are already invalidated). */
    onDone?: () => void;
    /** Tests only. */
    now?: Date;
}

export const CheckOutSheet = ({ record, farmName, farm, personName, onClose, onDone, now }: Props) => {
    const { t } = useTranslation();
    const manager = personName != null;

    // Frozen when the sheet opens, so "now" cannot drift under the bounds.
    const bounds = useMemo(() => {
        if (!record) return null;
        const nowMs = (now ?? new Date()).getTime();
        const inMs = Date.parse(record.checkInAt);
        const endMs = expectedEnd(record.checkInAt, farm).getTime();
        return { nowMs, inMs, endMs, endOk: endMs >= inMs && endMs <= nowMs };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record]);

    const clamp = (ms: number) => (bounds ? Math.min(bounds.nowMs, Math.max(bounds.inMs, ms)) : ms);

    const [option, setOption] = useState<TimeOption>('now');
    const [picked, setPicked] = useState(0);
    const [reason, setReason] = useState<ManagerCheckOutReason | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset per record. Own forgotten shift → default to the expected end (B.3).
    useEffect(() => {
        if (!bounds) return;
        setOption(manager ? 'now' : bounds.endOk ? 'shiftEnd' : 'pick');
        setPicked(clamp(bounds.endMs));
        setReason(null);
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bounds]);

    if (!record || !bounds) return null;

    const at = option === 'now' ? bounds.nowMs : option === 'shiftEnd' ? bounds.endMs : picked;
    const inBounds = at >= bounds.inMs && at <= bounds.nowMs;
    const canSubmit = inBounds && (!manager || !!reason) && !busy;

    const submit = async () => {
        if (!inBounds) {
            setError(t('attendance.checkoutTimeInvalid'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await attendanceApi.checkOut(record.id, {
                checkOutAt: new Date(at).toISOString(),
                ...(manager && reason ? { reason } : {}),
            });
            invalidateForEntity('attendance');
            onDone?.();
            onClose();
        } catch (e) {
            // Shown, not swallowed: a 400/409 here is the farmer's to read.
            setError(apiErrorMessage(e, t('attendance.checkOutError')));
        } finally {
            setBusy(false);
        }
    };

    const timeOptions: { value: TimeOption; label: string }[] = [
        { value: 'now', label: t('attendance.checkOutTimeNow', { time: formatTime(bounds.nowMs) }) },
        ...(bounds.endOk
            ? [{ value: 'shiftEnd' as const, label: t('attendance.checkOutTimeShiftEnd', { time: formatTime(bounds.endMs) }) }]
            : []),
        { value: 'pick', label: t('attendance.checkOutTimePick') },
    ];

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                {/* Swallows taps inside the sheet so they never reach the backdrop. */}
                <Pressable onPress={() => {}}>
                    <Card style={styles.sheet}>
                        <Text style={styles.title}>
                            {manager
                                ? t('attendance.checkOutMember', { name: personName, farm: farmName })
                                : t('team.checkOutOfFarm', { farm: farmName })}
                        </Text>
                        <Text style={styles.sub}>
                            {t('attendance.checkedInAgo', {
                                time: `${formatWeekday(record.checkInAt)} ${formatTime(record.checkInAt)}`,
                                ago: formatDuration(bounds.nowMs - bounds.inMs, t as unknown as TFn),
                            })}
                        </Text>

                        <ChipGroup
                            label={t('attendance.timeLabel')}
                            options={timeOptions}
                            value={option}
                            onChange={(v: TimeOption | null) => v && setOption(v)}
                        />

                        {option === 'pick' && (
                            <View style={styles.picker}>
                                <Text style={styles.pickedValue} testID="checkout-picked">
                                    {`${formatWeekday(picked)} ${formatTime(picked)}`}
                                </Text>
                                <View style={styles.steps}>
                                    {STEPS.map((s) => {
                                        const next = clamp(picked + s.ms);
                                        const disabled = next === picked;
                                        return (
                                            <TouchableOpacity
                                                key={s.key}
                                                testID={`checkout-step-${s.ms}`}
                                                style={[styles.step, disabled && styles.stepDisabled]}
                                                disabled={disabled}
                                                onPress={() => setPicked(next)}
                                                accessibilityRole="button"
                                                accessibilityState={{ disabled }}
                                            >
                                                <Text style={styles.stepLabel}>{t(s.key)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {manager && (
                            <ChipGroup
                                label={t('attendance.reasonLabel')}
                                options={REASONS.map((r) => ({ value: r, label: t(`attendance.reason_${r}`) }))}
                                value={reason}
                                onChange={(v: ManagerCheckOutReason | null) => setReason(v)}
                            />
                        )}

                        {error ? (
                            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
                        ) : null}

                        <View style={styles.actions}>
                            <Button title={t('common.cancel')} variant="outlined" onPress={onClose} style={styles.btn} />
                            <Button
                                title={t('team.checkOut')}
                                onPress={submit}
                                disabled={!canSubmit}
                                loading={busy}
                                style={styles.btn}
                            />
                        </View>
                    </Card>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing[5] },
    sheet: { padding: theme.spacing[4], gap: theme.spacing[3] },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    sub: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    picker: { gap: theme.spacing[2] },
    pickedValue: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '700' },
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    step: {
        minHeight: 48, minWidth: 64, paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.md, borderWidth: 1, borderColor: c.borderStrong,
        alignItems: 'center', justifyContent: 'center',
    },
    stepDisabled: { opacity: 0.4 },
    stepLabel: { ...theme.typeScale.labelLarge, color: c.textPrimary },
    error: { ...theme.typeScale.bodyMedium, color: c.dangerText },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], justifyContent: 'flex-end' },
    btn: { flexGrow: 1, flexBasis: 120, paddingHorizontal: theme.spacing[4] },
});
