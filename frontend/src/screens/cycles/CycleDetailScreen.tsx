import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricCard } from '../../components/ui/MetricCard';
import { theme } from '../../theme';
import { cropsApi, Crop } from '../../api/crops';

export const CycleDetailScreen = ({ route, navigation }: any) => {
    const { cycleId } = route.params;
    const [cycle, setCycle] = useState<Crop | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCycle = async () => {
        try {
            const { data } = await cropsApi.getById(cycleId);
            setCycle(data);
        } catch (error) {
            console.error('Failed to fetch cycle details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCycle();
        }, [cycleId])
    );

    const handleCloseCycle = () => {
        Alert.alert(
            'Close Cycle',
            'Are you sure you want to close this cycle? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cropsApi.close(cycleId);
                            navigation.goBack(); // returns to pond dashboard
                        } catch (error: any) {
                            Alert.alert('Error', 'Failed to close the cycle');
                        }
                    }
                },
            ]
        );
    };

    if (isLoading || !cycle) {
        return <ScreenWrapper><Text>Loading...</Text></ScreenWrapper>;
    }

    const calculateDOC = (stockingDateStr: string) => {
        const start = new Date(stockingDateStr).getTime();
        const end = cycle.actualHarvestDate ? new Date(cycle.actualHarvestDate).getTime() : new Date().getTime();
        const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Cycle Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.statusRow}>
                    <Text style={styles.label}>Status:</Text>
                    <StatusBadge
                        status={cycle.status === 'active' ? 'active' : 'info'}
                        label={cycle.status}
                    />
                </View>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Stocking Info</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>Stocking Date</Text>
                            <Text style={styles.infoValue}>{cycle.stockingDate ? new Date(cycle.stockingDate).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>DOC</Text>
                            <Text style={styles.infoValue}>{cycle.stockingDate ? calculateDOC(cycle.stockingDate) : (cycle.doc ?? 0)} days</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>Total Seed</Text>
                            <Text style={styles.infoValue}>{(cycle.stockingCount ?? cycle.totalSeed)?.toLocaleString() ?? 'N/A'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>Species</Text>
                            <Text style={styles.infoValue}>{cycle.speciesType ?? 'N/A'}</Text>
                        </View>
                    </View>
                </Card>

                <Text style={styles.sectionHeading}>Targets vs Current</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        label="Target SR"
                        value={`${cycle.targetSrPercent ?? 0}%`}
                    />
                    <MetricCard
                        label="Target Days"
                        value={`${cycle.targetCultivationDays ?? 120}`}
                    />
                    <MetricCard
                        label="Target Size"
                        value={`${cycle.targetSize ?? 0} pcs/kg`}
                    />
                </View>

                {cycle.status === 'active' && (
                    <View style={styles.actionContainer}>
                        <Button
                            title="Record Harvest"
                            onPress={() => navigation.navigate('HarvestHistory', { pondId: cycle.pondId, cycleId: cycle.id })}
                            style={styles.actionBtn}
                        />
                        <Button
                            title="Close Cycle"
                            onPress={handleCloseCycle}
                            variant="outlined"
                            style={[styles.actionBtn, styles.dangerBtn]}
                            textStyle={{ color: theme.roles.light.dangerText }}
                        />
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        marginBottom: theme.spacing[4],
    },
    backBtn: {
        padding: theme.spacing[2],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        paddingBottom: theme.spacing[12],
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    label: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    sectionCard: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        marginBottom: theme.spacing[4],
    },
    col: {
        flex: 1,
    },
    infoLabel: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    sectionHeading: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
    actionContainer: {
        marginTop: theme.spacing[4],
    },
    actionBtn: {
        marginBottom: theme.spacing[4],
    },
    dangerBtn: {
        borderColor: theme.roles.light.dangerText,
    },
});
