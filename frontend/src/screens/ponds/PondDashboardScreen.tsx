import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Animated,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { theme } from '../../theme';
import { pondsApi, Pond } from '../../api/ponds';
import { cropsApi, Crop } from '../../api/crops';
import { samplingApi } from '../../api/sampling';
import { feedApi } from '../../api/feedRecords';
import { harvestsApi } from '../../api/harvests';
import { waterQualityApi } from '../../api/waterQuality';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Action config ────────────────────────────────────────────────────────────

type ActionConfig = {
    label: string;
    icon: string;
    color: string;
    bg: string;
    logRoute: string;
    historyRoute: string;
};

const ACTION_CONFIG: ActionConfig[] = [
    {
        label: 'Water Quality',
        icon: 'water-percent',
        color: '#2196F3',
        bg: '#E3F2FD',
        logRoute: 'WaterQualityLog',
        historyRoute: 'WaterQualityHistory',
    },
    {
        label: 'Feed',
        icon: 'corn',
        color: '#FF9800',
        bg: '#FFF3E0',
        logRoute: 'FeedLog',
        historyRoute: 'FeedHistory',
    },
    {
        label: 'Sampling',
        icon: 'scale',
        color: '#4CAF50',
        bg: '#E8F5E9',
        logRoute: 'SamplingLog',
        historyRoute: 'SamplingHistory',
    },
    {
        label: 'Treatment',
        icon: 'pill',
        color: '#F44336',
        bg: '#FFEBEE',
        logRoute: 'TreatmentLog',
        historyRoute: 'TreatmentHistory',
    },
    {
        label: 'Mortality',
        icon: 'alert-circle',
        color: '#E53935',
        bg: '#FCE4EC',
        logRoute: 'MortalityLog',
        historyRoute: 'MortalityHistory',
    },
    {
        label: 'Disease',
        icon: 'virus',
        color: '#9C27B0',
        bg: '#F3E5F5',
        logRoute: 'DiseaseLog',
        historyRoute: 'DiseaseHistory',
    },
    {
        label: 'Chemical',
        icon: 'flask',
        color: '#FF6D00',
        bg: '#FFF8E1',
        logRoute: 'ChemicalLog',
        historyRoute: 'ChemicalHistory',
    },
    {
        label: 'Plankton',
        icon: 'leaf',
        color: '#00897B',
        bg: '#E0F2F1',
        logRoute: 'PlanktonLog',
        historyRoute: 'PlanktonHistory',
    },
    {
        label: 'Microbiology',
        icon: 'microscope',
        color: '#607D8B',
        bg: '#ECEFF1',
        logRoute: 'MicrobiologyLog',
        historyRoute: 'MicrobiologyHistory',
    },
    {
        label: 'Harvest',
        icon: 'basket',
        color: '#43A047',
        bg: '#F1F8E9',
        logRoute: 'HarvestLog',
        historyRoute: 'HarvestHistory',
    },
];

// ─── ActionChip ───────────────────────────────────────────────────────────────

type ChipMode = 'log' | 'history';

const ActionChip = ({
    item,
    mode,
    onPress,
}: {
    item: ActionConfig;
    mode: ChipMode;
    onPress: () => void;
}) => {
    const scale = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30 }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
        >
            <Animated.View style={[chipStyles.chip, { transform: [{ scale }] }]}>
                <View style={[chipStyles.iconWrap, { backgroundColor: item.bg }]}>
                    <MaterialCommunityIcons
                        name={mode === 'history' ? 'history' : (item.icon as any)}
                        size={20}
                        color={item.color}
                    />
                </View>
                <Text style={chipStyles.label} numberOfLines={1}>
                    {item.label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const chipStyles = StyleSheet.create({
    chip: {
        alignItems: 'center',
        width: (SCREEN_WIDTH - theme.spacing[4] * 2 - theme.spacing[3] * 2) / 3,
        paddingVertical: theme.spacing[3],
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 11,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'center',
    },
});

// ─── SectionTab ───────────────────────────────────────────────────────────────

const SectionTab = ({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={[tabStyles.tab, active && tabStyles.tabActive]}
        activeOpacity={0.7}
    >
        <Text style={[tabStyles.label, active && tabStyles.labelActive]}>{label}</Text>
    </TouchableOpacity>
);

const tabStyles = StyleSheet.create({
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    labelActive: {
        color: '#111827',
        fontWeight: '700',
    },
});

// ─── DOC Ring ─────────────────────────────────────────────────────────────────

const DOC_MAX = 120; // typical shrimp cycle ~120 days

const DocBadge = ({ doc }: { doc: number }) => {
    const progress = Math.min(doc / DOC_MAX, 1);
    const color =
        progress < 0.4 ? '#4CAF50' : progress < 0.75 ? '#FF9800' : '#F44336';

    return (
        <View style={docStyles.container}>
            <View style={[docStyles.ring, { borderColor: color + '30' }]}>
                <View style={[docStyles.innerRing, { borderColor: color }]} />
                <View style={docStyles.center}>
                    <Text style={[docStyles.number, { color }]}>{doc}</Text>
                    <Text style={docStyles.suffix}>DOC</Text>
                </View>
            </View>
        </View>
    );
};

const docStyles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    ring: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderStyle: 'dashed',
    },
    center: { alignItems: 'center' },
    number: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
    suffix: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PondDashboardScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [pond, setPond] = useState<Pond | null>(null);
    const [activeCycle, setActiveCycle] = useState<Crop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ChipMode>('log');

    // Metrics
    const [mbw, setMbw] = useState<string>('--');
    const [survival, setSurvival] = useState<string>('--');
    const [biomass, setBiomass] = useState<string>('--');
    const [fcr, setFcr] = useState<string>('--');
    const [wqAlert, setWqAlert] = useState<boolean>(false);

    // Fade-in animation
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const fetchData = async () => {
        try {
            const { data: pondData } = await pondsApi.getById(pondId);
            setPond(pondData);

            if (pondData.activeCycleId) {
                const { data: cycleData } = await cropsApi.getById(pondData.activeCycleId);
                setActiveCycle(cycleData);

                const [samplingRes, feedRes, harvestRes] = await Promise.all([
                    samplingApi.getAll(pondData.activeCycleId),
                    feedApi.getAll(pondId),
                    harvestsApi.getAll(),
                ]);

                // MBW & Survival & Biomass from Sampling
                const samplings = samplingRes.data || [];
                const sortedSamplings = [...samplings].sort(
                    (a, b) =>
                        new Date(b.samplingDate).getTime() - new Date(a.samplingDate).getTime()
                );
                let currentBiomass = 0;

                if (sortedSamplings.length > 0) {
                    const latest = sortedSamplings[0];
                    setMbw(latest.mbwG ? latest.mbwG.toString() : '--');
                    setSurvival(
                        latest.srEstimationPercent ? latest.srEstimationPercent.toString() : '--'
                    );
                    currentBiomass += Number(latest.biomassEstimationKg || 0);
                }

                // Harvest Biomass
                const harvests = harvestRes.data || [];
                const cycleHarvests = harvests.filter(
                    (h: any) => h.cropId === pondData.activeCycleId
                );
                const harvestedBiomass = cycleHarvests.reduce(
                    (sum: number, h: any) => sum + Number(h.weightKg || 0),
                    0
                );
                const totalBiomass = currentBiomass + harvestedBiomass;
                setBiomass(totalBiomass > 0 ? (totalBiomass / 1000).toFixed(2) : '--');

                // FCR
                const feeds = feedRes.data || [];
                const feedRecords = Array.isArray(feeds) ? feeds : (feeds as any).data || [];
                const cycleFeeds = feedRecords.filter(
                    (f: any) => f.cropId === pondData.activeCycleId
                );
                const totalFeedKg = cycleFeeds.reduce(
                    (sum: number, f: any) => sum + Number(f.quantityKg || 0),
                    0
                );
                setFcr(
                    totalBiomass > 0 && totalFeedKg > 0
                        ? (totalFeedKg / totalBiomass).toFixed(2)
                        : '--'
                );

                // WQ Alert
                try {
                    const wqLatestRes = await waterQualityApi.getLatest(pondId);
                    if (wqLatestRes.data?.recordedAt) {
                        const hoursDiff =
                            (Date.now() - new Date(wqLatestRes.data.recordedAt).getTime()) /
                            3_600_000;
                        setWqAlert(hoursDiff > 24);
                    } else {
                        setWqAlert(true);
                    }
                } catch {
                    setWqAlert(true);
                }
            } else {
                setActiveCycle(null);
                setMbw('--');
                setSurvival('--');
                setBiomass('--');
                setFcr('--');
                setWqAlert(false);
            }
        } catch (error) {
            console.error('Failed to fetch pond dashboard data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    useFocusEffect(
        useCallback(() => {
            fadeAnim.setValue(0);
            fetchData();
        }, [pondId])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const calculateDOC = (stockingDateStr: string): number => {
        const diff = Math.floor(
            (Date.now() - new Date(stockingDateStr).getTime()) / 86_400_000
        );
        return diff >= 0 ? diff : 0;
    };

    const navigateAction = (item: ActionConfig) => {
        const route = activeTab === 'log' ? item.logRoute : item.historyRoute;
        const params: Record<string, any> = { pondId, pondName };
        // Both log and history routes need cropId for fetching data
        if (activeCycle) params.cropId = activeCycle.id;
        navigation.navigate(route, params);
    };

    const doc = activeCycle?.stockingDate
        ? calculateDOC(activeCycle.stockingDate)
        : (activeCycle?.doc ?? 0);

    const pondStatusColor =
        pond?.status === 'active'
            ? '#4CAF50'
            : pond?.status === 'fallow'
            ? '#FF9800'
            : '#9E9E9E';

    return (
        <ScreenWrapper scroll={false} padded={false}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={[styles.statusDot, { backgroundColor: pondStatusColor }]} />
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {pondName}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="cog-outline" size={22} color="#111827" />
                </TouchableOpacity>
            </View>

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#2196F3']}
                            tintColor="#2196F3"
                        />
                    }
                >
                    {/* ── Alert ── */}
                    {activeCycle && wqAlert && (
                        <AlertBanner
                            title="Water Quality Alert"
                            message="No reading recorded in the last 24 hours"
                            type="warning"
                        />
                    )}

                    {/* ── Active Cycle Hero ── */}
                    {activeCycle ? (
                        <View style={styles.heroCard}>
                            {/* Top row: DOC ring + stocking info */}
                            <View style={styles.heroTop}>
                                <DocBadge doc={doc} />
                                <View style={styles.heroInfo}>
                                    <Text style={styles.heroLabel}>ACTIVE CYCLE</Text>
                                    <Text style={styles.heroName} numberOfLines={1}>
                                        {activeCycle.name}
                                    </Text>
                                    {activeCycle.stockingDate && (
                                        <Text style={styles.heroDate}>
                                            Stocked{' '}
                                            {new Date(activeCycle.stockingDate).toLocaleDateString(
                                                'en-IN',
                                                { day: 'numeric', month: 'short', year: 'numeric' }
                                            )}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.harvestBtn}
                                    onPress={() =>
                                        navigation.navigate('HarvestLog', {
                                            pondId,
                                            pondName,
                                            cropId: activeCycle.id,
                                        })
                                    }
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="basket-outline" size={16} color="#fff" />
                                    <Text style={styles.harvestBtnText}>Harvest</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Metrics row */}
                            <View style={styles.metricsRow}>
                                <MetricTile label="MBW" value={mbw} unit="g" icon="scale" />
                                <View style={styles.metricDivider} />
                                <MetricTile label="Survival" value={survival} unit="%" icon="heart-pulse" />
                                <View style={styles.metricDivider} />
                                <MetricTile label="Biomass" value={biomass} unit="T" icon="weight-kilogram" />
                                <View style={styles.metricDivider} />
                                <MetricTile label="FCR" value={fcr} unit="" icon="swap-horizontal" />
                            </View>
                        </View>
                    ) : (
                        /* ── Idle Pond ── */
                        <View style={styles.idleCard}>
                            <View style={styles.idleIconWrap}>
                                <MaterialCommunityIcons name="water-outline" size={40} color="#9CA3AF" />
                            </View>
                            <Text style={styles.idleTitle}>Pond is Idle</Text>
                            <Text style={styles.idleSubtitle}>Ready for the next crop cycle</Text>
                            <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => navigation.navigate('CreateCycle', { pondId })}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                                <Text style={styles.startBtnText}>Start New Cycle</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Actions (only when active) ── */}
                    {activeCycle && (
                        <View style={styles.actionsSection}>
                            {/* Tab switcher */}
                            <View style={styles.tabBar}>
                                <SectionTab
                                    label="Log Data"
                                    active={activeTab === 'log'}
                                    onPress={() => setActiveTab('log')}
                                />
                                <SectionTab
                                    label="View History"
                                    active={activeTab === 'history'}
                                    onPress={() => setActiveTab('history')}
                                />
                            </View>

                            {/* Action grid */}
                            <View style={styles.actionGrid}>
                                {ACTION_CONFIG.map((item) => (
                                    <ActionChip
                                        key={item.label}
                                        item={item}
                                        mode={activeTab}
                                        onPress={() => navigateAction(item)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 32 }} />
                </ScrollView>
            </Animated.View>
        </ScreenWrapper>
    );
};

// ─── MetricTile (inline, no external dep needed) ─────────────────────────────

const MetricTile = ({
    label,
    value,
    unit,
    icon,
}: {
    label: string;
    value: string;
    unit: string;
    icon: string;
}) => (
    <View style={tileStyles.container}>
        <MaterialCommunityIcons name={icon as any} size={14} color="#9CA3AF" style={{ marginBottom: 4 }} />
        <Text style={tileStyles.value}>
            {value}
            {value !== '--' && unit ? (
                <Text style={tileStyles.unit}> {unit}</Text>
            ) : null}
        </Text>
        <Text style={tileStyles.label}>{label}</Text>
    </View>
);

const tileStyles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    value: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    unit: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9CA3AF',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },

    scrollContent: {
        padding: 16,
        backgroundColor: '#F9FAFB',
    },

    // ── Hero card ──
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
    },
    heroInfo: {
        flex: 1,
    },
    heroLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    heroName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    heroDate: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    harvestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    harvestBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricDivider: {
        width: StyleSheet.hairlineWidth,
        height: 40,
        backgroundColor: '#E5E7EB',
    },

    // ── Idle card ──
    idleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    idleIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    idleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 6,
    },
    idleSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 24,
        textAlign: 'center',
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2196F3',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    startBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    // ── Actions section ──
    actionsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
        padding: 16,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});