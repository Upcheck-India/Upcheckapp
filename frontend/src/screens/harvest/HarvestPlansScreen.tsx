import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCachedFetch } from '../../query/hooks';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
import { MoltPeakBanner, useMoltWindows } from '../../components/molt/MoltPeakBanner';
import { PreHarvestCheck } from '../../components/harvest/PreHarvestCheck';
import { addDays, windowContaining } from '../../features/moltWindow';
import { theme } from '../../theme';
import { harvestPlansApi, HarvestPlan } from '../../api/harvestPlans';
import { apiErrorMessage } from '../../api/errors';
import { todayLocalISODate, toLocalISODate } from '../../utils/localDate';
import { usePermissions } from '../../hooks/usePermissions';
import { PriceQuoteSheet } from '../../components/harvest/PriceQuoteSheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
    planned: {
        labelKey: 'harvestPlans.statusPlanned',
        color: theme.roles.light.infoText,
        bg: theme.roles.light.infoBg,
    },
    completed: {
        labelKey: 'harvestPlans.statusCompleted',
        color: theme.roles.light.successText,
        bg: theme.roles.light.successBg,
    },
    cancelled: {
        labelKey: 'harvestPlans.statusCancelled',
        color: theme.roles.light.textDisabled,
        bg: theme.roles.light.surfaceVariant,
    },
};

/** targetKg × expectedPrice, or undefined when either is missing. */
export const expectedRevenueOf = (targetKg?: number, price?: number): number | undefined =>
    targetKg != null && price != null && targetKg > 0 && price > 0
        ? Math.round(targetKg * price * 100) / 100
        : undefined;

/** The pre-harvest check shows on a planned card from 2 days before its date (M2). */
export const showsPreHarvestCheck = (plan: HarvestPlan, today: string): boolean =>
    plan.status === 'planned' && !!plan.plannedHarvestDate && today >= addDays(plan.plannedHarvestDate.slice(0, 10), -2);

const fromIso = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    // Bucket by the farm's local (IST) calendar day, not UTC — a harvest stamped
    // late-evening IST must not display under the next UTC day (DATE-1).
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr.split('T')[0] : toLocalISODate(d);
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

interface PlanCardProps {
    plan: HarvestPlan;
    farmId?: string;
    onComplete: (plan: HarvestPlan) => void;
    onDelete: (plan: HarvestPlan) => void;
    isActioning: boolean;
    /** RECORD_HARVEST: completing a plan logs a harvest; delete rides the same gate. */
    canAct: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onComplete, onDelete, isActioning, canAct }) => {
    const { t } = useTranslation();
    const sc = getStatusConfig(plan.status);
    const isPlanned = plan.status === 'planned';

    return (
        <Card style={styles.planCard}>
            {/* Header row: date + status badge */}
            <View style={styles.planHeader}>
                <View style={styles.planDateRow}>
                    <MaterialCommunityIcons
                        name="calendar-outline"
                        size={16}
                        color={theme.roles.light.textSecondary}
                    />
                    <Text style={styles.planDate}>{formatDate(plan.plannedHarvestDate)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{t(sc.labelKey)}</Text>
                </View>
            </View>

            {/* Metrics row */}
            <View style={styles.metricsRow}>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>{t('harvestPlans.targetWeight', 'Target Weight')}</Text>
                    <Text style={styles.metricValue}>
                        {plan.targetWeightKg != null ? `${plan.targetWeightKg} kg` : '—'}
                    </Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>{t('harvestPlans.pricePerKg', 'Price / kg')}</Text>
                    <Text style={styles.metricValue}>
                        {plan.expectedPricePerKg != null ? `₹${plan.expectedPricePerKg}` : '—'}
                    </Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>{t('harvestPlans.expRevenue', 'Exp. Revenue')}</Text>
                    <Text style={styles.metricValue}>
                        {plan.expectedRevenue != null ? `₹${plan.expectedRevenue}` : '—'}
                    </Text>
                </View>
            </View>

            {/* Actual values (for completed plans) */}
            {plan.status === 'completed' && (
                <View style={[styles.metricsRow, styles.actualRow]}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabelActual}>{t('harvestPlans.actualWeight', 'Actual Weight')}</Text>
                        <Text style={styles.metricValueActual}>
                            {plan.actualWeightKg != null ? `${plan.actualWeightKg} kg` : '—'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabelActual}>{t('harvestPlans.actualPrice', 'Actual Price')}</Text>
                        <Text style={styles.metricValueActual}>
                            {plan.actualPricePerKg != null ? `₹${plan.actualPricePerKg}` : '—'}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabelActual}>{t('harvestPlans.actRevenue', 'Act. Revenue')}</Text>
                        <Text style={styles.metricValueActual}>
                            {plan.actualRevenue != null ? `₹${plan.actualRevenue}` : '—'}
                        </Text>
                    </View>
                </View>
            )}

            {plan.notes ? (
                <Text style={styles.planNotes} numberOfLines={2}>{plan.notes}</Text>
            ) : null}

            {plan.plannedHarvestDate && showsPreHarvestCheck(plan, todayLocalISODate()) && (
                <PreHarvestCheck pondId={plan.pondId} cropId={plan.cropId} date={plan.plannedHarvestDate.slice(0, 10)} />
            )}

            {/* Action buttons — only for 'planned' status, only with RECORD_HARVEST */}
            {isPlanned && canAct && (
                <View style={styles.actionRow}>
                    <Button
                        title={t('harvestPlans.markComplete', 'Mark Complete')}
                        variant="outlined"
                        onPress={() => onComplete(plan)}
                        disabled={isActioning}
                        style={styles.actionBtn}
                    />
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => onDelete(plan)}
                        disabled={isActioning}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={20}
                            color={theme.roles.light.dangerText}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </Card>
    );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export const HarvestPlansScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId, farmId } = route.params ?? {};

    const [actioningId, setActioningId] = useState<string | null>(null);

    const { canRecordHarvest, canViewFinancials } = usePermissions(farmId);

    // Date picker: molt peak days strong, post days light (M2 §4).
    const { data: moltWindows } = useMoltWindows();
    const moltShade = useCallback((d: Date) => {
        const phase = windowContaining(moltWindows, toLocalISODate(d))?.phase;
        return phase === 'peak' ? 'strong' : phase === 'post' ? 'light' : null;
    }, [moltWindows]);

    // Add-plan form state
    const [showForm, setShowForm] = useState(false);
    const [formPlannedDate, setFormPlannedDate] = useState(
        todayLocalISODate(),
    );
    const [formTargetWeight, setFormTargetWeight] = useState('');
    const [formPricePerKg, setFormPricePerKg] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);

    // H6 "Plan this harvest": open the add form filled from Harvest Timing's
    // chosen day, projected kg and expected ₹/kg.
    const prefill = route.params?.prefill;
    useEffect(() => {
        if (!prefill?.date) return;
        setFormPlannedDate(prefill.date);
        setFormTargetWeight(prefill.targetKg != null ? String(prefill.targetKg) : '');
        setFormPricePerKg(prefill.pricePerKg != null ? String(prefill.pricePerKg) : '');
        setShowForm(true);
    }, [prefill?.date, prefill?.targetKg, prefill?.pricePerKg]);

    // ------------------------------------------------------------------
    // Fetch
    // ------------------------------------------------------------------

    // Last list paints instantly; every focus revalidates.
    const query = useCachedFetch(
        ['harvestPlans', pondId],
        async (): Promise<HarvestPlan[]> => (await harvestPlansApi.getAll(pondId)).data,
    );
    const plans = query.data ?? [];
    const isLoading = query.isInitialLoading;
    const isRefreshing = query.isRefreshing;
    const handleRefresh = query.refresh;
    const fetchPlans = query.refetch;

    // A failed load still says so, as it always did.
    useEffect(() => {
        if (query.error) {
            Alert.alert(
                t('common.error', 'Error'),
                apiErrorMessage(query.error, t('harvestPlans.loadFailed', 'Failed to load harvest plans')),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.errorUpdatedAt]);

    // ------------------------------------------------------------------
    // Complete
    // ------------------------------------------------------------------

    // One revenue path (H4): "Mark complete" is logging the harvest. The
    // harvest save completes the plan server-side, in the same transaction —
    // the plan never books income of its own any more.
    const handleComplete = useCallback((plan: HarvestPlan) => {
        const planCropId = plan.cropId ?? cropId;
        if (!planCropId) {
            Alert.alert(t('common.error', 'Error'), t('harvestPlans.noCycle'));
            return;
        }
        navigation.navigate('HarvestLog', {
            pondId: plan.pondId,
            pondName,
            cropId: planCropId,
            farmId,
            planId: plan.id,
            harvestType: 'full',
            prefill: {
                date: plan.plannedHarvestDate,
                targetKg: plan.targetWeightKg,
                expectedPrice: plan.expectedPricePerKg,
            },
        });
    }, [navigation, pondName, cropId, farmId, t]);

    // ------------------------------------------------------------------
    // Delete
    // ------------------------------------------------------------------

    const handleDelete = useCallback((plan: HarvestPlan) => {
        Alert.alert(
            t('harvestPlans.deletePlan', 'Delete Plan'),
            t('harvestPlans.deleteConfirm', {
                date: formatDate(plan.plannedHarvestDate),
                defaultValue: `Delete the harvest plan for ${formatDate(plan.plannedHarvestDate)}?`,
            }),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('common.delete', 'Delete'),
                    style: 'destructive',
                    onPress: () => {
                        setActioningId(plan.id);
                        harvestPlansApi
                            .delete(plan.id)
                            .then(() => fetchPlans())
                            .catch((err: any) =>
                                Alert.alert(
                                    t('common.error', 'Error'),
                                    apiErrorMessage(err, t('harvestPlans.deleteFailed', 'Failed to delete harvest plan')),
                                ),
                            )
                            .finally(() => setActioningId(null));
                    },
                },
            ],
        );
    }, [fetchPlans, t]);

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    const handleCreate = useCallback(async () => {
        if (!formPlannedDate.trim()) {
            Alert.alert(
                t('harvestPlans.validationTitle', 'Validation Error'),
                t('harvestPlans.dateRequired', 'Planned harvest date is required'),
            );
            return;
        }

        const targetKg = formTargetWeight ? Number(formTargetWeight) : undefined;
        const price = formPricePerKg ? Number(formPricePerKg) : undefined;
        setIsSubmitting(true);
        try {
            await harvestPlansApi.create({
                pondId,
                cropId: cropId ?? undefined,
                plannedHarvestDate: formPlannedDate.trim(),
                targetWeightKg: targetKg,
                expectedPricePerKg: price,
                // Never sent before H4, so every plan showed "—" for it.
                expectedRevenue: expectedRevenueOf(targetKg, price),
                notes: formNotes.trim() || undefined,
            });
            // Reset form
            setFormPlannedDate(todayLocalISODate());
            setFormTargetWeight('');
            setFormPricePerKg('');
            setFormNotes('');
            setShowForm(false);
            await fetchPlans();
        } catch (err: any) {
            Alert.alert(
                t('common.error', 'Error'),
                apiErrorMessage(err, t('harvestPlans.createFailed', 'Failed to create harvest plan')),
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [pondId, cropId, formPlannedDate, formTargetWeight, formPricePerKg, formNotes, fetchPlans, t]);

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    const renderPlan = useCallback(
        ({ item }: { item: HarvestPlan }) => (
            <PlanCard
                key={item.id}
                plan={item}
                farmId={farmId}
                onComplete={handleComplete}
                onDelete={handleDelete}
                isActioning={actioningId === item.id}
                canAct={canRecordHarvest}
            />
        ),
        [farmId, handleComplete, handleDelete, actioningId, canRecordHarvest],
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={theme.roles.light.textPrimary}
                    />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('harvestPlans.title', 'Harvest Plans')}</Text>
                    {pondName ? (
                        <Text style={styles.headerSubtitle}>{pondName}</Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    onPress={() => setShowForm((v) => !v)}
                    style={styles.addBtn}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={showForm ? 'close' : 'plus'}
                        size={24}
                        color={theme.roles.light.primary}
                    />
                </TouchableOpacity>
            </View>

            {canViewFinancials && farmId ? (
                <TouchableOpacity
                    onPress={() => setQuoteOpen(true)}
                    style={styles.quoteLink}
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="currency-inr" size={16} color={theme.roles.light.primary} />
                    <Text style={styles.quoteLinkText}>{t('engines.quote.open')} ›</Text>
                </TouchableOpacity>
            ) : null}

            {/* Full-page loading spinner */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                    <Text style={styles.loadingText}>{t('harvestPlans.loading', 'Loading harvest plans…')}</Text>
                </View>
            ) : (
                <FlatList
                    data={plans}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(item) => item.id}
                    renderItem={renderPlan}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.roles.light.primary]}
                            tintColor={theme.roles.light.primary}
                        />
                    }
                    ListHeaderComponent={
                        showForm ? (
                            <Card style={styles.formCard}>
                                <Text style={styles.formTitle}>{t('harvestPlans.addTitle', 'Add Harvest Plan')}</Text>

                                <CalendarPicker
                                    label={t('harvestPlans.plannedDate', 'Planned Harvest Date')}
                                    value={fromIso(formPlannedDate)}
                                    onChange={(d) => setFormPlannedDate(toLocalISODate(d))}
                                    minDate={new Date()}
                                    required
                                    shade={moltShade}
                                />
                                <MoltPeakBanner messageKey="harvestPlans.moltWindowWarning" date={formPlannedDate} />
                                <Input
                                    label={t('harvestPlans.targetWeightKg', 'Target Weight (kg)')}
                                    value={formTargetWeight}
                                    onChangeText={setFormTargetWeight}
                                    placeholder="e.g. 500"
                                    keyboardType="decimal-pad"
                                    leftIcon="weight-kilogram"
                                />
                                <Input
                                    label={t('harvestPlans.expectedPrice', 'Expected Price per kg (₹)')}
                                    value={formPricePerKg}
                                    onChangeText={setFormPricePerKg}
                                    placeholder="e.g. 280"
                                    keyboardType="decimal-pad"
                                    leftIcon="currency-inr"
                                />
                                <Input
                                    label={t('harvestPlans.notes', 'Notes')}
                                    value={formNotes}
                                    onChangeText={setFormNotes}
                                    placeholder={t('harvestPlans.notesPlaceholder', 'Optional notes about this harvest plan')}
                                    multiline
                                    numberOfLines={3}
                                    style={styles.textArea}
                                />

                                <View style={styles.formActions}>
                                    <Button
                                        title={t('common.cancel', 'Cancel')}
                                        variant="outlined"
                                        onPress={() => setShowForm(false)}
                                        style={styles.cancelBtn}
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        title={t('harvestPlans.addPlan', 'Add Plan')}
                                        onPress={() => void handleCreate()}
                                        loading={isSubmitting}
                                        style={styles.submitBtn}
                                    />
                                </View>
                            </Card>
                        ) : null
                    }
                    ListEmptyComponent={
                        !showForm ? (
                            <EmptyState
                                icon="calendar-check-outline"
                                title={t('harvestPlans.emptyTitle', 'No Harvest Plans')}
                                subtitle={t('harvestPlans.emptySubtitle', 'Tap + to add your first harvest plan for this pond.')}
                                actionLabel={t('harvestPlans.addPlan', 'Add Plan')}
                                onAction={() => setShowForm(true)}
                            />
                        ) : null
                    }
                />
            )}

            <PriceQuoteSheet farmId={farmId} visible={quoteOpen} onClose={() => setQuoteOpen(false)} />
        </ScreenWrapper>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    quoteLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
    },
    quoteLinkText: { ...theme.typeScale.labelLarge, color: theme.roles.light.primary },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    headerSubtitle: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[0.5],
    },
    addBtn: {
        padding: theme.spacing[4],
    },

    // Loading
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[3],
    },
    loadingText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },

    // List
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
        flexGrow: 1,
    },

    // Add-plan form card
    formCard: {
        marginBottom: theme.spacing[6],
    },
    formTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    textArea: {
        minHeight: 72,
        textAlignVertical: 'top',
    },
    formActions: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
    },
    cancelBtn: {
        flex: 1,
    },
    submitBtn: {
        flex: 1,
    },

    // Plan card
    planCard: {
        marginBottom: theme.spacing[4],
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
    },
    planDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
    },
    planDate: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    statusText: {
        ...theme.typeScale.labelSmall,
    },
    metricsRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing[3],
        gap: theme.spacing[2],
    },
    metric: {
        flex: 1,
        backgroundColor: theme.roles.light.surfaceVariant,
        borderRadius: theme.radius.sm,
        padding: theme.spacing[3],
        alignItems: 'center',
    },
    metricLabel: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[1],
        textAlign: 'center',
    },
    metricValue: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
    },
    actualRow: {
        marginTop: -theme.spacing[1],
    },
    metricLabelActual: {
        ...theme.typeScale.caption,
        color: theme.roles.light.successText,
        marginBottom: theme.spacing[1],
        textAlign: 'center',
    },
    metricValueActual: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.successText,
        fontWeight: '600',
        textAlign: 'center',
    },
    planNotes: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[3],
        fontStyle: 'italic',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
    },
    actionBtn: {
        flex: 1,
    },
    deleteBtn: {
        width: 44,
        height: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.dangerBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
