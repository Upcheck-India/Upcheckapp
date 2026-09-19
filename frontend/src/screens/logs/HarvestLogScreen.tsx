import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { MoltPeakBanner } from '../../components/molt/MoltPeakBanner';
import { theme } from '../../theme';
import { harvestsApi, RejectedReason } from '../../api/harvests';
import { cropsApi, computeDoc } from '../../api/crops';
import { pondContextApi } from '../../api/pondContext';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate, toLocalISODate } from '../../utils/localDate';
import { formatDate } from '../../utils/formatDate';
import { confirm } from '../../utils/confirm';
import { saveRecord } from '../../sync/recordSync';
import { pondsApi } from '../../api/ponds';
import { usePermissions } from '../../hooks/usePermissions';
import { groupIndian } from '../../features/inrFormat';
import { parseGroupedNumber } from '../../features/parseNumericInput';
import {
    GradeDraft, MAX_GRADES, REJECTED_REASONS, countFromAbw, draftsFor, parseGrades, priceOutOfBand, summarize,
} from '../../features/harvestGrades';

/** 'YYYY-MM-DD' → a local-midnight Date (the picker works in local days). */
const fromIso = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

const ERROR_KEYS: Record<string, string> = {
    HARVEST_DATE_FUTURE: 'logs.harvest_errorDateFuture',
    HARVEST_DATE_BEFORE_STOCKING: 'logs.harvest_errorDateBeforeStocking',
};

export const HarvestLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId, editRecord } = route.params;
    const isEditing = !!editRecord;

    // The sale section is money: only a member with VIEW_FINANCIALS on THIS
    // pond's farm sees it (the server strips/masks prices for everyone else).
    // Until the pond's farm is known — or offline — this falls back to the
    // active farm, which is where the pond almost always lives.
    const [farmId, setFarmId] = useState<string | undefined>(route.params.farmId);
    useEffect(() => {
        if (farmId || !pondId) return;
        let cancelled = false;
        pondsApi
            .getById(pondId)
            .then(({ data }) => {
                if (!cancelled) setFarmId(data.farmId);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [pondId, farmId]);
    const { canViewFinancials } = usePermissions(farmId);

    const [harvestDate, setHarvestDate] = useState<string>(
        editRecord?.harvestDate ? String(editRecord.harvestDate).slice(0, 10) : todayLocalISODate(),
    );
    // `harvestType` param: CycleDetail's "Close → Harvested" opens this as Full.
    const [harvestType, setHarvestType] = useState<'partial' | 'full'>(
        editRecord?.harvestType ?? route.params.harvestType ?? 'partial',
    );
    const [grades, setGrades] = useState<GradeDraft[]>(() =>
        editRecord ? draftsFor(editRecord) : [{ kg: '', count: '', price: '' }],
    );
    const [showDeductions, setShowDeductions] = useState(editRecord?.rejectedKg != null);
    const [rejectedKg, setRejectedKg] = useState(editRecord?.rejectedKg != null ? String(editRecord.rejectedKg) : '');
    const [rejectedReason, setRejectedReason] = useState<RejectedReason | null>(editRecord?.rejectedReason ?? null);
    const [buyerName, setBuyerName] = useState(editRecord?.buyerName ?? '');
    const [notes, setNotes] = useState(editRecord?.notes ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // One id per form: a retry after a failed online save replays the SAME
    // harvest (idempotent server-side) instead of minting a duplicate.
    const harvestId = useRef<string | null>(null);

    // Stocking date bounds the picker and fills the full-harvest confirmation.
    const [stockingDate, setStockingDate] = useState<string | null>(null);
    useEffect(() => {
        if (!cropId) return;
        let cancelled = false;
        cropsApi
            .getById(cropId)
            .then(({ data }) => {
                if (!cancelled && data?.stockingDate) setStockingDate(String(data.stockingDate).slice(0, 10));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [cropId]);

    // Latest ABW: labelled count prefill, and the piece estimate for ungraded lines.
    const [abw, setAbw] = useState<{ g: number; at: string | null } | null>(null);
    useEffect(() => {
        if (!pondId) return;
        let cancelled = false;
        pondContextApi
            .get(pondId)
            .then(({ data }) => {
                if (cancelled || data?.abwG == null) return;
                setAbw({ g: data.abwG, at: data.samplingAt });
                const prefill = countFromAbw(data.abwG);
                // Only a fresh form, only an untouched first row — never a silent overwrite.
                if (!isEditing && prefill != null) {
                    setGrades((gs) => (gs.length === 1 && !gs[0].count ? [{ ...gs[0], count: String(prefill) }] : gs));
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [pondId, isEditing]);
    const prefillCount = !isEditing ? countFromAbw(abw?.g) : null;

    const parsed = useMemo(() => parseGrades(grades), [grades]);
    const summary = useMemo(() => summarize(parsed.grades, abw?.g ?? null), [parsed, abw]);

    const setGrade = (i: number, patch: Partial<GradeDraft>) =>
        setGrades((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));

    const doDelete = async () => {
        const ok = await confirm({
            title: t('logs.harvest_deleteTitle'),
            message: editRecord.harvestType === 'full' ? t('logs.harvest_deleteMessageFull') : t('logs.harvest_deleteMessage'),
            confirmLabel: t('logs.harvest_deleteBtn'),
            cancelLabel: t('common.cancel'),
            destructive: true,
        });
        if (!ok) return;
        try {
            await harvestsApi.delete(editRecord.id);
            showToast({ message: t('common.savedSuccess'), type: 'success' });
            navigation.goBack();
        } catch (error: any) {
            const code = error?.response?.data?.code;
            Alert.alert(t('common.error'), t(code === 'POND_HAS_NEW_CYCLE' ? 'logs.harvest_errorNewCycle' : 'logs.harvest_errorDelete'));
        }
    };

    const handleSave = async () => {
        if (parsed.error) {
            const key = { weight: 'logs.harvest_errorWeight', count: 'logs.harvest_errorCount', price: 'logs.harvest_errorPrice' }[parsed.error.field];
            Alert.alert(t('common.error'), t(key, { n: parsed.error.index + 1 }));
            return;
        }
        const rejected = rejectedKg.trim() ? parseGroupedNumber(rejectedKg) : null;
        if (rejectedKg.trim() && (rejected == null || rejected < 0)) {
            Alert.alert(t('common.error'), t('logs.harvest_validationWeight'));
            return;
        }

        // Warn, never block (daily-logging D4): an odd ₹/kg is confirmed, then sent.
        const odd = canViewFinancials ? parsed.grades.find(priceOutOfBand) : undefined;
        if (odd) {
            const ok = await confirm({
                title: t('logs.harvest_priceWarnTitle'),
                message: t('logs.harvest_priceWarnMessage', { price: groupIndian(odd.pricePerKg as number) }),
                confirmLabel: t('common.save'),
                cancelLabel: t('common.cancel'),
            });
            if (!ok) return;
        }

        // A harvest is a money record: overwriting one is worth a question.
        if (isEditing) {
            const ok = await confirm({
                title: t('common.confirmEditTitle'),
                message: t('common.confirmEditMessage'),
                confirmLabel: t('common.save'),
                cancelLabel: t('common.cancel'),
            });
            if (!ok) return;
        } else if (harvestType === 'full') {
            // A full harvest closes the cycle — that deserves one plain sentence.
            const ok = await confirm({
                title: t('logs.harvest_fullConfirmTitle'),
                message: stockingDate
                    ? t('logs.harvest_fullConfirmMessage', {
                          pond: pondName,
                          stocked: formatDate(fromIso(stockingDate)),
                          days: computeDoc({ stockingDate, actualHarvestDate: harvestDate, initialAgeDays: 0 } as any),
                      })
                    : t('logs.harvest_fullConfirmMessageShort', { pond: pondName }),
                confirmLabel: t('logs.harvest_fullConfirmBtn'),
                cancelLabel: t('common.cancel'),
                destructive: true,
            });
            if (!ok) return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                harvestDate,
                // Grades travel INSIDE the one payload: one saveRecord, one
                // idempotent replay keyed on the harvest id (H1 offline rule).
                grades: parsed.grades.map((g) => ({
                    ...(g.id ? { id: g.id } : {}),
                    weightKg: g.weightKg,
                    countPerKg: g.countPerKg,
                    // Never send (hidden, masked) prices for a member who
                    // cannot see them; the server keeps the owner's on edit.
                    ...(canViewFinancials ? { pricePerKg: g.pricePerKg } : {}),
                })),
                ...(odd ? { confirmOutOfRange: true } : {}),
                // An explicit null CLEARS a deduction / buyer on edit.
                rejectedKg: rejected,
                rejectedReason: rejected != null ? rejectedReason : null,
                buyerName: canViewFinancials ? buyerName.trim() || null : undefined,
                notes: notes.trim() || null,
            };

            if (isEditing) {
                // Editing a past record is not a field-logging action, so it
                // goes straight to the API rather than the offline queue.
                await harvestsApi.update(editRecord.id, payload);
                showToast({ message: t('common.savedSuccess'), type: 'success' });
            } else {
                harvestId.current ??= Crypto.randomUUID();
                const res = await saveRecord({
                    entity: 'harvest',
                    endpoint: '/harvests',
                    payload: { id: harvestId.current, cropId, harvestType, ...payload },
                });
                showToast({
                    message: res.queued
                        ? t('common.savedOffline', 'Saved — will sync when online')
                        : t('common.savedSuccess'),
                    type: 'success',
                });
                // H3: a saved full harvest closed the cycle — show its result.
                // Queued offline, the server has nothing to report yet.
                if (harvestType === 'full' && !res.queued && cropId) {
                    navigation.replace('CycleResult', { cropId });
                    return;
                }
            }

            navigation.goBack();
        } catch (error: any) {
            const code = error?.response?.data?.code;
            // Nothing was written, and retrying can never succeed — so no
            // "try again": say what happened and leave the form.
            if (code === 'CYCLE_CLOSED') {
                Alert.alert(t('common.error'), t('logs.harvest_errorCycleClosed'), [
                    { text: t('common.ok'), onPress: () => navigation.goBack() },
                ]);
                return;
            }
            if (code && ERROR_KEYS[code]) {
                Alert.alert(t('common.error'), t(ERROR_KEYS[code]));
                return;
            }
            console.error('Failed to log harvest', error);
            Alert.alert(t('common.error'), t('logs.harvest_errorSave'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const summaryParts = [
        t('logs.harvest_summaryKg', { kg: groupIndian(summary.weightKg) }),
        summary.pieces != null
            ? t(summary.piecesEstimated ? 'logs.harvest_summaryPiecesEst' : 'logs.harvest_summaryPieces', { pieces: groupIndian(summary.pieces) })
            : null,
        summary.avgCount != null ? t('logs.harvest_summaryAvg', { count: summary.avgCount }) : null,
        canViewFinancials && summary.totalRupees != null ? t('logs.harvest_summaryTotal', { amount: groupIndian(summary.totalRupees) }) : null,
    ].filter(Boolean);

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>{isEditing ? t('logs.editTitle', 'Edit Reading') : t('logs.harvest_title')}</Text>
                    <Text style={styles.subtitle}>{pondName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <MoltPeakBanner messageKey="logs.moltPeakHarvest" />
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.harvest_sectionDetails')}</Text>

                    <View style={styles.typeSelector}>
                        {(['partial', 'full'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.typeBtn, harvestType === type && styles.typeBtnActive]}
                                // Immutable after create (H2): a full harvest closed the cycle.
                                disabled={isEditing}
                                onPress={() => setHarvestType(type)}
                            >
                                <Text style={[styles.typeText, harvestType === type && styles.typeTextActive]}>
                                    {t(type === 'partial' ? 'logs.harvest_typePartial' : 'logs.harvest_typeFull')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {isEditing && <Text style={styles.hint}>{t('logs.harvest_typeLocked')}</Text>}

                    <CalendarPicker
                        label={t('logs.harvest_labelDate')}
                        value={fromIso(harvestDate)}
                        onChange={(d) => setHarvestDate(toLocalISODate(d))}
                        minDate={stockingDate ? fromIso(stockingDate) : undefined}
                        maxDate={new Date()}
                        required
                    />
                </Card>

                <Card style={styles.card}>
                    {grades.map((g, i) => {
                        const line = parsed.grades[i];
                        const lineTotal =
                            canViewFinancials && line?.pricePerKg != null ? line.weightKg * line.pricePerKg : null;
                        return (
                            <View key={i} style={styles.gradeBlock}>
                                <View style={styles.gradeHeader}>
                                    <Text style={styles.gradeTitle}>{t('logs.harvest_gradeTitle', { n: i + 1 })}</Text>
                                    {lineTotal != null && (
                                        <Text style={styles.lineTotal}>{t('logs.harvest_gradeLineTotal', { amount: groupIndian(lineTotal) })}</Text>
                                    )}
                                    {grades.length > 1 && (
                                        <TouchableOpacity
                                            onPress={() => setGrades((gs) => gs.filter((_, j) => j !== i))}
                                            accessibilityRole="button"
                                            accessibilityLabel={t('logs.harvest_gradeRemove')}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <MaterialCommunityIcons name="close" size={20} color={theme.roles.light.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.gradeRow}>
                                    <GradeCell
                                        label={t('logs.harvest_gradeKg')}
                                        value={g.kg}
                                        onChangeText={(kg) => setGrade(i, { kg })}
                                        placeholder={t('logs.harvest_placeholderTotalWeight')}
                                    />
                                    <GradeCell
                                        label={t('logs.harvest_gradeCount')}
                                        value={g.count}
                                        onChangeText={(count) => setGrade(i, { count })}
                                    />
                                    {canViewFinancials && (
                                        <GradeCell
                                            label={t('logs.harvest_gradePrice')}
                                            value={g.price}
                                            onChangeText={(price) => setGrade(i, { price })}
                                        />
                                    )}
                                </View>
                                {canViewFinancials && line && priceOutOfBand(line) && (
                                    <Text style={styles.warn}>{t('logs.harvest_priceWarnInline')}</Text>
                                )}
                            </View>
                        );
                    })}
                    {prefillCount != null && abw?.at && (
                        <Text style={styles.hint}>
                            {t('logs.harvest_prefillCount', { count: prefillCount, date: formatDate(abw.at) })}
                        </Text>
                    )}
                    {grades.length < MAX_GRADES && (
                        <TouchableOpacity
                            style={styles.addGrade}
                            onPress={() => setGrades((gs) => [...gs, { kg: '', count: '', price: '' }])}
                            accessibilityRole="button"
                        >
                            <MaterialCommunityIcons name="plus" size={18} color={theme.roles.light.primary} />
                            <Text style={styles.addGradeText}>{t('logs.harvest_addGrade')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.deductionsToggle}
                        onPress={() => setShowDeductions((v) => !v)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.deductionsText}>{t('logs.harvest_deductions')}</Text>
                        <MaterialCommunityIcons
                            name={showDeductions ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.roles.light.textSecondary}
                        />
                    </TouchableOpacity>
                    {showDeductions && (
                        <>
                            <Input
                                label={t('logs.harvest_rejectedKg')}
                                value={rejectedKg}
                                onChangeText={setRejectedKg}
                                keyboardType="decimal-pad"
                            />
                            <ChipGroup
                                label={t('logs.harvest_rejectedBecause')}
                                options={REJECTED_REASONS.map((r) => ({ value: r, label: t(`logs.harvest_reason_${r}`) }))}
                                value={rejectedReason}
                                onChange={setRejectedReason}
                            />
                        </>
                    )}
                </Card>

                <Card style={styles.card}>
                    {canViewFinancials && (
                        <>
                            <Text style={styles.sectionTitle}>{t('logs.harvest_sectionSales')}</Text>
                            <Input
                                label={t('logs.harvest_labelBuyerName')}
                                value={buyerName}
                                onChangeText={setBuyerName}
                                placeholder={t('logs.harvest_placeholderBuyerName')}
                            />
                        </>
                    )}
                    <Input label={t('logs.harvest_labelNotes')} value={notes} onChangeText={setNotes} multiline />
                </Card>

                {summary.weightKg > 0 && <Text style={styles.summary}>{summaryParts.join(' · ')}</Text>}

                <Button
                    title={isEditing ? t('logs.updateBtn', 'Update') : t('logs.harvest_saveBtn')}
                    onPress={handleSave}
                    loading={isSubmitting}
                    style={styles.saveBtn}
                />
                {isEditing && (
                    <Button
                        title={t('logs.harvest_deleteBtn')}
                        onPress={doDelete}
                        variant="outlined"
                        style={styles.saveBtn}
                    />
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const GradeCell = ({
    label,
    value,
    onChangeText,
    placeholder,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
}) => (
    <View style={styles.cell}>
        <Text style={styles.cellLabel}>{label}</Text>
        <TextInput
            style={styles.cellInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor={theme.roles.light.textTertiary}
            accessibilityLabel={label}
        />
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary, textAlign: 'center' },
    subtitle: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, textAlign: 'center' },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    typeSelector: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[2],
    },
    typeBtn: {
        flex: 1,
        paddingVertical: theme.spacing[3],
        alignItems: 'center',
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    typeBtnActive: {
        backgroundColor: theme.roles.light.primary,
        borderColor: theme.roles.light.primary,
    },
    typeText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textSecondary,
    },
    typeTextActive: {
        color: theme.roles.light.surface,
    },
    hint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[3] },
    warn: { ...theme.typeScale.bodySmall, color: theme.roles.light.warningText, marginTop: theme.spacing[1] },
    gradeBlock: { marginBottom: theme.spacing[4] },
    gradeHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] },
    gradeTitle: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary, flex: 1 },
    lineTotal: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
    gradeRow: { flexDirection: 'row', gap: theme.spacing[2] },
    cell: { flex: 1 },
    cellLabel: { ...theme.typeScale.labelSmall, color: theme.roles.light.textSecondary, marginBottom: 4 },
    cellInput: {
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    addGrade: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], paddingVertical: theme.spacing[2] },
    addGradeText: { ...theme.typeScale.labelLarge, color: theme.roles.light.primary },
    deductionsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
        marginTop: theme.spacing[2],
    },
    deductionsText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    summary: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing[3],
    },
    saveBtn: {
        marginTop: theme.spacing[2],
    },
});
