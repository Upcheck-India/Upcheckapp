import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { MoonPhaseCard } from '../../components/ui/MoonPhaseCard';
import { FarmGlanceCards } from '../../components/dashboard/FarmGlanceCards';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useActiveFarmStore } from '../../store/activeFarmStore';
import { usePermissions } from '../../hooks/usePermissions';
import { ROLE_LABEL } from '../../permissions/capabilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportsApi, DashboardSummary } from '../../api/reports';
import { farmsApi } from '../../api/farms';
import { pondsApi, type Pond } from '../../api/ponds';
import { pondContextApi } from '../../api/pondContext';
import { farmMembersApi } from '../../api/farmMembers';
import { ONBOARDING_FLAG } from '../onboarding/WelcomeScreen';

// A worker never sees WelcomeScreen/CreateFarm/PondSetup (those only gate
// owner accounts — pendingFarmSetup is only set for accountType==='owner'),
// so before this session's fix a worker's first app-open had ZERO onboarding
// of any kind: no role explanation, no context on the farm they'd joined
// (docs/ONBOARDING_MODULE_PLAN.md §1.2/Phase 1). This one-time, dismissible
// interstitial closes that gap without blocking anything — same pattern as
// ONBOARDING_FLAG, just keyed separately since it's a different milestone.
export const WORKER_WELCOME_FLAG = '@upcheck:worker_welcomed';

export const HomeScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { selectedFarm, setSelectedFarm } = useActiveFarmStore();
    const perms = usePermissions(selectedFarm?.id);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [ponds, setPonds] = useState<Pond[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    // "Getting Started" checklist (onboarding-plan Phase 2, extending the
    // finish-setup nudge from Task 7 into real activation milestones, not
    // just pond count): set up ponds → log a first reading → invite your
    // team. Reappears every visit while incomplete (persistent); a farmer
    // mid-task can dismiss it for this visit without it blocking anything
    // (dismissible) — plain component state is enough, it resets naturally
    // next time this screen mounts. Disappears entirely once every milestone
    // is done — unlike a reminder, a finished checklist has nothing left to say.
    const [plannedPondCount, setPlannedPondCount] = useState<number | null>(null);
    const [hasLoggedSomething, setHasLoggedSomething] = useState<boolean | null>(null);
    const [hasInvitedWorker, setHasInvitedWorker] = useState<boolean | null>(null);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);
    // Worker first-run interstitial — see WORKER_WELCOME_FLAG above.
    const [showWorkerWelcome, setShowWorkerWelcome] = useState(false);
    // Distinct from summary===null: on a fetch FAILURE we must show a retry state,
    // not the "no farm data / create your first farm" CTA (which is for a genuinely
    // empty account). Conflating them pushes an existing owner to re-create a farm.
    const [error, setError] = useState<any>(null);

    const fetchSummary = useCallback(async () => {
        setError(null);
        try {
            // The dashboard aggregates per-farm; without a farmId the backend
            // returns all-zeros. Use the selected farm, else default to the
            // user's first farm (and remember it as the active farm).
            let farmId = selectedFarm?.id;
            if (!farmId) {
                const { data: farms } = await farmsApi.getAll();
                const first = Array.isArray(farms) ? farms[0] : undefined;
                if (first) {
                    farmId = first.id;
                    setSelectedFarm({ id: first.id, name: first.name, location: (first as any).location });
                }
            }
            const { data } = await reportsApi.getDashboardSummary(farmId);
            setSummary(data);
        } catch (err) {
            console.error("Failed to fetch dashboard summary", err);
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedFarm?.id, setSelectedFarm]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchSummary();
    }, [fetchSummary]);

    const onRetry = useCallback(() => {
        setIsLoading(true);
        fetchSummary();
    }, [fetchSummary]);

    // Ponds for the one-tap "Your Ponds" shortcut — so the farmer reaches a pond
    // (and its daily loop) without drilling Farms → Farm → Pond.
    useEffect(() => {
        pondsApi.getMine().then(({ data }) => setPonds(data)).catch(() => setPonds([]));
    }, []);

    // Planned vs. actual pond count for the selected farm — one of the
    // Getting Started checklist items below.
    useEffect(() => {
        if (!selectedFarm?.id) {
            setPlannedPondCount(null);
            return;
        }
        farmsApi
            .getById(selectedFarm.id)
            .then(({ data }) => setPlannedPondCount(data.plannedPondCount ?? null))
            .catch(() => setPlannedPondCount(null));
    }, [selectedFarm?.id]);

    const pondsForSelectedFarm = selectedFarm?.id
        ? ponds.filter((p) => p.farmId === selectedFarm.id).length
        : ponds.length;
    const remainingPonds =
        plannedPondCount != null ? Math.max(0, plannedPondCount - pondsForSelectedFarm) : 0;
    const pondsStepDone = plannedPondCount == null || remainingPonds === 0;

    // "Logged a reading" — checked against the first pond's latest-input
    // snapshot rather than every pond (a representative signal is enough for
    // an activation checklist; it doesn't need to be a precise per-pond
    // analytics count).
    useEffect(() => {
        const firstPond = selectedFarm?.id ? ponds.find((p) => p.farmId === selectedFarm.id) : ponds[0];
        if (!firstPond) {
            setHasLoggedSomething(false);
            return;
        }
        pondContextApi
            .get(firstPond.id)
            .then(({ data }) => setHasLoggedSomething(
                data.lastFeedAt != null || data.waterQuality?.recordedAt != null || data.samplingAt != null,
            ))
            .catch(() => setHasLoggedSomething(false));
    }, [selectedFarm?.id, ponds]);

    // "Invited your team" — more than just the owner as a farm member.
    useEffect(() => {
        if (!selectedFarm?.id) {
            setHasInvitedWorker(null);
            return;
        }
        farmMembersApi
            .listMembers(selectedFarm.id)
            .then(({ data }) => setHasInvitedWorker(data.length > 1))
            .catch(() => setHasInvitedWorker(false));
    }, [selectedFarm?.id]);

    const checklistItems = [
        { key: 'ponds', done: pondsStepDone, label: t('home.checklistPonds', 'Set up your ponds'), icon: 'water-outline' as const },
        { key: 'log', done: hasLoggedSomething ?? false, label: t('home.checklistLog', 'Log your first reading'), icon: 'clipboard-check-outline' as const },
        { key: 'invite', done: hasInvitedWorker ?? false, label: t('home.checklistInvite', 'Invite your team'), icon: 'account-plus-outline' as const },
    ];
    const checklistLoading = hasLoggedSomething == null || hasInvitedWorker == null;
    const checklistDoneCount = checklistItems.filter((i) => i.done).length;
    const showGettingStarted =
        !nudgeDismissed && !!selectedFarm?.id && !checklistLoading && checklistDoneCount < checklistItems.length;

    // First-run: a brand-new farmer with no farms and who hasn't seen the welcome
    // gets a one-time guided intro. The flag is set inside WelcomeScreen.
    useEffect(() => {
        (async () => {
            try {
                if (await AsyncStorage.getItem(ONBOARDING_FLAG)) return;
                const { data: farms } = await farmsApi.getAll();
                if (Array.isArray(farms) && farms.length === 0) {
                    (navigation.getParent() ?? navigation).navigate('Welcome');
                }
            } catch {
                /* non-blocking; onboarding is a nicety, never a gate */
            }
        })();
    }, []);

    // Worker first-run interstitial: only once, only for a worker who has
    // resolved a farm (so there's a real name/role to show), never re-shown
    // once dismissed. Waiting on selectedFarm/perms.role avoids a flash of
    // the banner with blank content before the farm/membership loads.
    useEffect(() => {
        if (!perms.isWorker || !selectedFarm?.id || !perms.role) return;
        (async () => {
            try {
                if (await AsyncStorage.getItem(WORKER_WELCOME_FLAG)) return;
                setShowWorkerWelcome(true);
            } catch {
                /* non-blocking; the interstitial is a nicety, never a gate */
            }
        })();
    }, [perms.isWorker, perms.role, selectedFarm?.id]);

    const dismissWorkerWelcome = () => {
        setShowWorkerWelcome(false);
        AsyncStorage.setItem(WORKER_WELCOME_FLAG, '1').catch(() => {});
    };

    // Root-stack screens (CreateFarm, PondDashboard, Settings…) live above the
    // tab navigator; navigate via the parent so they resolve from a tab.
    const goRoot = (screen: string, params?: any) =>
        navigation.getParent()?.navigate(screen, params) ?? navigation.navigate(screen, params);

    const quickActions = [
        // "Today" (Morning Briefing) is the actual "what do I do right now"
        // destination, so it leads — previously this screen had zero
        // navigation entry points anywhere in the app (see docs/UI_UX_AUDIT.md
        // Tier 1 #2 / docs/ONBOARDING_MODULE_PLAN.md Phase 2).
        { icon: 'weather-sunset-up' as const, label: t('home.actionToday', 'Today'), screen: 'MorningBriefing', isTab: false, color: theme.roles.light.primary },
        { icon: 'barn' as const, label: t('home.actionFarms'), screen: 'Farms', isTab: true, color: theme.roles.light.primary },
        { icon: 'calculator-variant-outline' as const, label: t('home.actionCalculators'), screen: 'CalculatorHub', isTab: false, color: theme.roles.light.infoBorder },
        // Simulations are an owner/manager planning tool — hide for worker/viewer.
        ...(perms.canManageOperations
            ? [{ icon: 'chart-timeline-variant' as const, label: t('home.actionSimulate'), screen: 'SimulationList', isTab: false, color: theme.roles.light.successText }]
            : []),
        { icon: 'cog-outline' as const, label: t('home.actionSettings'), screen: 'Settings', isTab: false, color: theme.roles.light.warningText },
    ];

    return (
        <ScreenWrapper
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.roles.light.primary]} tintColor={theme.roles.light.primary} />
            }
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{t('home.greeting')}</Text>
                    <Text style={styles.userName}>
                        {user?.name || user?.email?.split('@')[0] || t('home.farmerFallback')}
                    </Text>
                    {perms.role ? (
                        <Text style={styles.roleLabel}>{ROLE_LABEL[perms.role]}</Text>
                    ) : null}
                </View>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Settings') ?? navigation.navigate('Settings')} style={styles.avatar} accessibilityRole="button" accessibilityLabel={t('common.settings', 'Settings')}>
                    <MaterialCommunityIcons name="account-circle" size={40} color={theme.roles.light.primary} />
                </TouchableOpacity>
            </View>

            {/* Getting Started checklist (onboarding-plan Phase 2): tracks real
                activation milestones, not just pond count. Reappears every visit
                while incomplete, dismissible for now, and disappears entirely
                once every milestone is done. */}
            {showGettingStarted && (
                <Card style={styles.checklistCard}>
                    <View style={styles.checklistHead}>
                        <Text style={styles.checklistTitle}>{t('home.gettingStartedTitle', 'Getting started')}</Text>
                        <View style={styles.checklistHeadRight}>
                            <Text style={styles.checklistCount}>{checklistDoneCount}/{checklistItems.length}</Text>
                            <TouchableOpacity
                                onPress={() => setNudgeDismissed(true)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.dismiss', 'Dismiss')}
                                style={styles.nudgeDismiss}
                            >
                                <MaterialCommunityIcons name="close" size={18} color={theme.roles.light.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {checklistItems.map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={item.done ? 1 : 0.7}
                            disabled={item.done}
                            onPress={() => {
                                if (item.key === 'ponds') goRoot('PondSetup', { farmId: selectedFarm!.id, totalPonds: remainingPonds || 1 });
                                else if (item.key === 'log') goRoot('QuickLog');
                                else if (item.key === 'invite') goRoot('AddWorker', { farmId: selectedFarm!.id });
                            }}
                            style={styles.checklistRow}
                        >
                            <View style={[styles.checklistBadge, item.done && styles.checklistBadgeDone]}>
                                <MaterialCommunityIcons
                                    name={item.done ? 'check' : item.icon}
                                    size={16}
                                    color={item.done ? theme.roles.light.textInverse : theme.roles.light.textSecondary}
                                />
                            </View>
                            <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>{item.label}</Text>
                            {!item.done && <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textTertiary} />}
                        </TouchableOpacity>
                    ))}
                </Card>
            )}

            {/* Worker first-run interstitial (onboarding-plan Phase 1): a worker
                previously got zero explanation of their role or which farm
                they'd joined on their very first app-open. One-time, dismissible,
                never blocks reaching the rest of the app underneath it. */}
            {showWorkerWelcome && selectedFarm && perms.role && (
                <Card style={styles.workerWelcomeCard}>
                    <View style={styles.workerWelcomeIcon}>
                        <MaterialCommunityIcons name="account-check-outline" size={24} color={theme.roles.light.primary} />
                    </View>
                    <Text style={styles.workerWelcomeTitle}>
                        {t('home.workerWelcomeTitle', { farmName: selectedFarm.name, role: ROLE_LABEL[perms.role], defaultValue: "You're part of {{farmName}}'s team as a {{role}}" })}
                    </Text>
                    <Text style={styles.workerWelcomeBody}>
                        {t('home.workerWelcomeBody', 'Tap "Log now" anytime to record today\'s water, feed, or other readings for your ponds.')}
                    </Text>
                    <Button
                        title={t('home.workerWelcomeCta', 'Got it')}
                        onPress={dismissWorkerWelcome}
                        style={styles.ctaBtn}
                    />
                </Card>
            )}

            {/* Worker home is task-first: a single large "Log now" entry to the
                daily loop. Owners/managers get the portfolio below instead. */}
            {perms.isWorker && (
                <Card style={styles.logNowCard}>
                    <View style={styles.logNowIcon}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={28} color={theme.roles.light.primary} />
                    </View>
                    <Text style={styles.logNowText}>{t('home.workerLogPrompt', "Record today's readings for your ponds")}</Text>
                    <Button
                        title={t('home.logNow', 'Log now')}
                        onPress={() => goRoot('QuickLog')}
                        style={styles.ctaBtn}
                    />
                </Card>
            )}

            <Text style={styles.sectionTitle}>{t('home.dashboardSummary')}</Text>
            {isLoading ? (
                // Skeleton placeholders matching the stat grid — perceived speed
                // beats a spinner on low-end devices (design system §6/§7).
                <View style={styles.statsGrid}>
                    {[0, 1, 2, 3].map((i) => (
                        <Card key={i} style={styles.statCard}>
                            <Skeleton width={44} height={28} />
                            <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
                        </Card>
                    ))}
                </View>
            ) : error && !summary ? (
                // Fetch failed and we have nothing cached — show retry, NOT the
                // create-farm CTA (the owner already has farms; only the request failed).
                <ErrorState
                    title={t('home.summaryErrorTitle', "Couldn't load your dashboard")}
                    error={error}
                    onRetry={onRetry}
                />
            ) : summary ? (
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water" size={32} color={theme.roles.light.primary} />
                        <Text style={styles.statValue}>{summary.activePondsCount}</Text>
                        <Text style={styles.statLabel}>{t('home.activePonds')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="water-outline" size={32} color={theme.roles.light.textSecondary} />
                        <Text style={styles.statValue}>{summary.totalPondsCount}</Text>
                        <Text style={styles.statLabel}>{t('home.totalPonds')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="alert" size={32} color={theme.roles.light.dangerText} />
                        <Text style={styles.statValue}>{summary.lowStockAlerts}</Text>
                        <Text style={styles.statLabel}>{t('home.lowStockAlerts')}</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <MaterialCommunityIcons name="corn" size={32} color={theme.roles.light.warningText} />
                        <Text style={styles.statValue}>{summary.todayFeedUsage}</Text>
                        <Text style={styles.statLabel}>{t('home.todayFeed')}</Text>
                    </Card>
                </View>
            ) : (
                <Card style={styles.ctaCard}>
                    <View style={styles.ctaIcon}>
                        <MaterialCommunityIcons name="barn" size={28} color={theme.roles.light.primary} />
                    </View>
                    {user?.accountType === 'worker' ? (
                        // A worker with no farm membership yet — guide them, don't push farm creation.
                        <Text style={styles.ctaText}>
                            {t('home.workerNoFarm', 'Ask your farm owner to add you to a farm to get started.')}
                        </Text>
                    ) : (
                        <>
                            <Text style={styles.ctaText}>{t('home.noFarmData')}</Text>
                            <Button
                                title={t('home.quickLogCreateFarm')}
                                onPress={() => goRoot('CreateFarm')}
                                style={styles.ctaBtn}
                            />
                        </>
                    )}
                </Card>
            )}

            {/* Your Ponds — one tap from the dashboard into any pond's daily loop. */}
            {ponds.length > 0 && (
                <>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>{t('home.yourPonds')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Farms')}>
                            <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pondRow}>
                        {ponds.slice(0, 8).map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                activeOpacity={0.85}
                                onPress={() => goRoot('PondDashboard', { pondId: p.id, pondName: p.displayName || p.name })}
                            >
                                <Card style={styles.pondCard}>
                                    <MaterialCommunityIcons name="water" size={22} color={theme.roles.light.primary} />
                                    <Text style={styles.pondName} numberOfLines={1}>{p.displayName || p.name}</Text>
                                    <Text style={styles.pondMeta} numberOfLines={1}>
                                        {p.activeCycleId ? t('home.pondActive') : t('home.pondIdle')}
                                    </Text>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

            <Text style={styles.sectionTitle}>{t('home.lunarCycle')}</Text>
            <View style={styles.moonSection}>
                <MoonPhaseCard />
            </View>

            {/* Farm-at-a-glance includes expenses + P&L, so it's owner/manager only
                (VIEW_FINANCIALS); workers/viewers don't see farm economics. */}
            {selectedFarm?.id && perms.canViewFinancials && (
                <>
                    <Text style={styles.sectionTitle}>{t('home.farmGlance')}</Text>
                    <FarmGlanceCards farmId={selectedFarm.id} farmName={selectedFarm.name} navigation={navigation} />
                </>
            )}

            <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
            <View style={styles.grid}>
                {quickActions.map((action) => (
                    <TouchableOpacity
                        key={action.label}
                        style={styles.actionCard}
                        onPress={() => action.isTab ? navigation.navigate(action.screen) : navigation.getParent()?.navigate(action.screen) ?? navigation.navigate(action.screen)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
                            <MaterialCommunityIcons name={action.icon} size={28} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    checklistCard: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    checklistHead: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
    },
    checklistHeadRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
    checklistTitle: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    checklistCount: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
    checklistRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
        paddingVertical: theme.spacing[2],
    },
    checklistBadge: {
        width: 28, height: 28, borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.surfaceVariant, alignItems: 'center', justifyContent: 'center',
    },
    checklistBadgeDone: { backgroundColor: theme.roles.light.successBorder },
    checklistLabel: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, flex: 1 },
    checklistLabelDone: { color: theme.roles.light.textTertiary, textDecorationLine: 'line-through' },
    nudgeDismiss: { padding: theme.spacing[1] },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[6],
    },
    greeting: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    userName: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
    },
    roleLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.primary,
        marginTop: 2,
    },
    logNowCard: {
        alignItems: 'center',
        padding: theme.spacing[5],
        marginBottom: theme.spacing[6],
        gap: theme.spacing[2],
    },
    logNowIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.roles.light.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    logNowText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    moonSection: {
        marginBottom: theme.spacing[6],
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    actionCard: {
        width: '47%',
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
    },
    actionLabel: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textPrimary,
    },
    ctaCard: {
        alignItems: 'center',
        padding: theme.spacing[5],
        marginBottom: theme.spacing[6],
        gap: theme.spacing[2],
    },
    ctaIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.roles.light.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    ctaText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    ctaBtn: { alignSelf: 'stretch', marginTop: theme.spacing[2] },
    workerWelcomeCard: {
        alignItems: 'center',
        padding: theme.spacing[5],
        marginBottom: theme.spacing[6],
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.infoBg,
    },
    workerWelcomeIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: theme.roles.light.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    workerWelcomeTitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
    },
    workerWelcomeBody: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
    },
    viewAll: { ...theme.typeScale.labelMedium, color: theme.roles.light.primary },
    pondRow: { gap: theme.spacing[3], paddingBottom: theme.spacing[2], marginBottom: theme.spacing[6] },
    pondCard: { width: 130, padding: theme.spacing[4], gap: theme.spacing[1] },
    pondName: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600', marginTop: theme.spacing[1] },
    pondMeta: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
    loadingContainer: {
        paddingVertical: theme.spacing[8],
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    statCard: {
        width: '47%',
        padding: theme.spacing[4],
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[2],
        marginBottom: 4,
    },
    statLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
});
