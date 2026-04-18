import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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

export const PondDashboardScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [pond, setPond] = useState<Pond | null>(null);
    const [activeCycle, setActiveCycle] = useState<Crop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Metrics State
    const [mbw, setMbw] = useState<string>('--');
    const [survival, setSurvival] = useState<string>('--');
    const [biomass, setBiomass] = useState<string>('--');
    const [fcr, setFcr] = useState<string>('--');
    const [wqAlert, setWqAlert] = useState<boolean>(false);

    const fetchData = async () => {
        try {
            const { data: pondData } = await pondsApi.getById(pondId);
            setPond(pondData);

            if (pondData.activeCycleId) {
                const { data: cycleData } = await cropsApi.getById(pondData.activeCycleId);
                setActiveCycle(cycleData);

                // Fetch metrics
                const [samplingRes, feedRes, harvestRes, wqRes] = await Promise.all([
                    samplingApi.getAll(pondData.activeCycleId),
                    feedApi.getAll(pondId),
                    harvestsApi.getAll(),
                    waterQualityApi.getAll(pondId, { take: 1 }), // Assuming this gets the latest if sorted by DESC, or use getLatest if backend implements it. wait! the endpoint is getAll? The interface has getLatest. Let's just use getLatest! Wait, waterQuality.ts has getLatest!
                ]);

                // MBW & Survival & partial Biomass from Sampling
                const samplings = samplingRes.data || [];
                const sortedSamplings = [...samplings].sort((a, b) => new Date(b.samplingDate).getTime() - new Date(a.samplingDate).getTime());
                let currentBiomass = 0;

                if (sortedSamplings.length > 0) {
                    const latest = sortedSamplings[0];
                    setMbw(latest.mbwG ? latest.mbwG.toString() : '--');
                    setSurvival(latest.srEstimationPercent ? latest.srEstimationPercent.toString() : '--');
                    currentBiomass += Number(latest.biomassEstimationKg || 0);
                }

                // Total Harvest Biomass
                const harvests = harvestRes.data || [];
                const cycleHarvests = harvests.filter(h => h.cropId === pondData.activeCycleId);
                const harvestedBiomass = cycleHarvests.reduce((sum, h) => sum + Number(h.weightKg || 0), 0);

                const totalBiomass = currentBiomass + harvestedBiomass;
                setBiomass(totalBiomass > 0 ? (totalBiomass / 1000).toFixed(2) : '--'); // Convert kg to Tons

                // FCR
                const feeds = feedRes.data || [];
                // The actual payload might be wrapped in PageDto
                const feedRecords = Array.isArray(feeds) ? feeds : (feeds as any).data || [];
                const cycleFeeds = feedRecords.filter((f: any) => f.cropId === pondData.activeCycleId);
                const totalFeedKg = cycleFeeds.reduce((sum: number, f: any) => sum + Number(f.quantityKg || 0), 0);

                if (totalBiomass > 0 && totalFeedKg > 0) {
                    setFcr((totalFeedKg / totalBiomass).toFixed(2));
                } else {
                    setFcr('--');
                }

                // WQ Alert
                try {
                    const wqLatestRes = await waterQualityApi.getLatest(pondId);
                    if (wqLatestRes.data && wqLatestRes.data.recordedAt) {
                        const lastWqDate = new Date(wqLatestRes.data.recordedAt).getTime();
                        const now = new Date().getTime();
                        const hoursDiff = (now - lastWqDate) / (1000 * 60 * 60);
                        setWqAlert(hoursDiff > 24);
                    } else {
                        setWqAlert(true); // No records
                    }
                } catch(e) {
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
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [pondId])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const calculateDOC = (stockingDateStr: string) => {
        const start = new Date(stockingDateStr).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{pondName}</Text>
                    {pond && <StatusBadge status={pond.status === 'active' ? 'active' : pond.status === 'fallow' ? 'idle' : 'info'} label={pond.status} style={styles.headerBadge} />}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
                    <MaterialCommunityIcons name="cog-outline" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} />}
            >
                {/* Alerts / Banner Section */}
                {activeCycle && wqAlert && (
                    <AlertBanner title="Check Water Quality" message="No reading in last 24h" type="warning" />
                )}

                {/* Hero Card / Active Cycle */}
                {activeCycle ? (
                    <Card style={styles.heroCard} variant="elevated">
                        <View style={styles.heroHeader}>
                            <Text style={styles.heroTitle}>DOC {activeCycle.stockingDate ? calculateDOC(activeCycle.stockingDate) : (activeCycle.doc ?? 0)}</Text>
                            <Text style={styles.heroSubtitle}>{activeCycle.stockingDate ? `Stocked ${new Date(activeCycle.stockingDate).toLocaleDateString()}` : activeCycle.name}</Text>
                        </View>

                        <View style={styles.metricsGrid}>
                            <MetricCard label="MBW" value={mbw} unit="g" />
                            <MetricCard label="Survival" value={survival} unit="%" target={85} />
                            <MetricCard label="Biomass" value={biomass} unit="T" />
                            <MetricCard label="FCR" value={fcr} target={1.3} />
                        </View>

                        <Button
                            title="Close Cycle / Harvest"
                            onPress={() => navigation.navigate('HarvestLog', { pondId, pondName, cropId: activeCycle.id })}
                            variant="outlined"
                            style={styles.cycleBtn}
                        />
                    </Card>
                ) : (
                    <Card style={styles.emptyCycleCard}>
                        <MaterialCommunityIcons name="water" size={48} color={theme.roles.light.textDisabled} />
                        <Text style={styles.emptyCycleTitle}>Pond is Idle</Text>
                        <Text style={styles.emptyCycleSubtitle}>Ready for the next crop cycle.</Text>
                        <Button
                            title="Start New Cycle"
                            onPress={() => navigation.navigate('CreateCycle', { pondId })}
                            style={styles.startCycleBtn}
                        />
                    </Card>
                )}

                {/* Quick Actions (only show if active cycle) */}
                {activeCycle && (
                    <View style={styles.quickActionsContainer}>
                        <Text style={styles.sectionTitle}>Log Data</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('WaterQualityLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.infoBg }]}>
                                    <MaterialCommunityIcons name="water-percent" size={26} color={theme.roles.light.infoBorder} />
                                </View>
                                <Text style={styles.actionLabel}>Water Quality</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('FeedLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.warningText + '15' }]}>
                                    <MaterialCommunityIcons name="corn" size={26} color={theme.roles.light.warningText} />
                                </View>
                                <Text style={styles.actionLabel}>Feed</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('SamplingLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.successText + '15' }]}>
                                    <MaterialCommunityIcons name="scale" size={26} color={theme.roles.light.successText} />
                                </View>
                                <Text style={styles.actionLabel}>Sampling</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('TreatmentLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.dangerText + '15' }]}>
                                    <MaterialCommunityIcons name="pill" size={26} color={theme.roles.light.dangerText} />
                                </View>
                                <Text style={styles.actionLabel}>Treatment</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('MortalityLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: '#F4433615' }]}>
                                    <MaterialCommunityIcons name="alert-circle" size={26} color="#F44336" />
                                </View>
                                <Text style={styles.actionLabel}>Mortality</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('DiseaseLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: '#9C27B015' }]}>
                                    <MaterialCommunityIcons name="virus" size={26} color="#9C27B0" />
                                </View>
                                <Text style={styles.actionLabel}>Disease</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('ChemicalLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: '#FF980015' }]}>
                                    <MaterialCommunityIcons name="flask" size={26} color="#FF9800" />
                                </View>
                                <Text style={styles.actionLabel}>Chemical</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('PlanktonLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: '#4CAF5015' }]}>
                                    <MaterialCommunityIcons name="leaf" size={26} color="#4CAF50" />
                                </View>
                                <Text style={styles.actionLabel}>Plankton</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('MicrobiologyLog', { pondId, pondName, cropId: activeCycle.id })}>
                                <View style={[styles.actionIconBg, { backgroundColor: '#60738015' }]}>
                                    <MaterialCommunityIcons name="microscope" size={26} color="#607380" />
                                </View>
                                <Text style={styles.actionLabel}>Microbiology</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: {
        padding: theme.spacing[2],
    },
    settingsBtn: {
        padding: theme.spacing[2],
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    headerBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    scrollContent: {
        padding: theme.spacing[4],
    },
    heroCard: {
        marginBottom: theme.spacing[6],
        padding: theme.spacing[4],
        backgroundColor: theme.roles.light.primary,
    },
    heroHeader: {
        marginBottom: theme.spacing[4],
    },
    heroTitle: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textInverse,
    },
    heroSubtitle: {
        ...theme.typeScale.bodyMedium,
        color: 'rgba(255,255,255,0.8)',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing[2],
    },
    cycleBtn: {
        marginTop: theme.spacing[4],
        borderColor: 'rgba(255,255,255,0.5)',
    },
    emptyCycleCard: {
        alignItems: 'center',
        padding: theme.spacing[8],
        marginBottom: theme.spacing[6],
    },
    emptyCycleTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[4],
    },
    emptyCycleSubtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[6],
        textAlign: 'center',
    },
    startCycleBtn: {
        width: '100%',
    },
    quickActionsContainer: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[4],
    },
    actionItem: {
        alignItems: 'center',
        width: '28%',
        marginBottom: theme.spacing[3],
    },
    actionIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing[2],
    },
    actionLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textPrimary,
        textAlign: 'center',
    },
});
