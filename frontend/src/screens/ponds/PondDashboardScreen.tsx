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

export const PondDashboardScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [pond, setPond] = useState<Pond | null>(null);
    const [activeCycle, setActiveCycle] = useState<Crop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const { data: pondData } = await pondsApi.getById(pondId);
            setPond(pondData);

            if (pondData.activeCycleId) {
                const { data: cycleData } = await cropsApi.getById(pondData.activeCycleId);
                setActiveCycle(cycleData);
            } else {
                setActiveCycle(null);
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
                    {pond && <StatusBadge status={pond.status === 'active' ? 'active' : 'idle'} label={pond.status} style={styles.headerBadge} />}
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
                {activeCycle && (
                    <AlertBanner title="Check Water Quality" message="No reading in last 24h" type="warning" />
                )}

                {/* Hero Card / Active Cycle */}
                {activeCycle ? (
                    <Card style={styles.heroCard} variant="elevated">
                        <View style={styles.heroHeader}>
                            <Text style={styles.heroTitle}>DOC {calculateDOC(activeCycle.stockingDate)}</Text>
                            <Text style={styles.heroSubtitle}>Stocked {new Date(activeCycle.stockingDate).toLocaleDateString()}</Text>
                        </View>

                        <View style={styles.metricsGrid}>
                            <MetricCard label="MBW" value="12.4" unit="g" trend="up" trendValue="+0.4g" />
                            <MetricCard label="Survival" value="84" unit="%" status="safe" target={85} />
                            <MetricCard label="Biomass" value="1.2" unit="T" />
                            <MetricCard label="FCR" value="1.42" status="warning" target={1.3} />
                        </View>

                        <Button
                            title="Close Cycle / Harvest"
                            onPress={() => navigation.navigate('CycleDetail', { cycleId: activeCycle.id })}
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
                            <TouchableOpacity style={styles.actionItem} onPress={() => {/* Navigate to wq */ }}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.infoBg }]}>
                                    <MaterialCommunityIcons name="water-percent" size={26} color={theme.roles.light.infoBorder} />
                                </View>
                                <Text style={styles.actionLabel}>Water Quality</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => {/* Navigate to feed */ }}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.warningText + '15' }]}>
                                    <MaterialCommunityIcons name="corn" size={26} color={theme.roles.light.warningText} />
                                </View>
                                <Text style={styles.actionLabel}>Feed</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => {/* Navigate to sampling */ }}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.successText + '15' }]}>
                                    <MaterialCommunityIcons name="scale" size={26} color={theme.roles.light.successText} />
                                </View>
                                <Text style={styles.actionLabel}>Sampling</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => {/* Navigate to treatment */ }}>
                                <View style={[styles.actionIconBg, { backgroundColor: theme.roles.light.dangerText + '15' }]}>
                                    <MaterialCommunityIcons name="pill" size={26} color={theme.roles.light.dangerText} />
                                </View>
                                <Text style={styles.actionLabel}>Treatment</Text>
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
        justifyContent: 'space-between',
    },
    actionItem: {
        alignItems: 'center',
        width: '22%',
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
