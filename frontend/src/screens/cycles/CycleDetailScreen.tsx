import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricCard } from '../../components/ui/MetricCard';
import { Colors, typography, spacing, radius } from '../../theme';
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
        const end = cycle.closedAt ? new Date(cycle.closedAt).getTime() : new Date().getTime();
        const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
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
                            <Text style={styles.infoValue}>{new Date(cycle.stockingDate).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>DOC</Text>
                            <Text style={styles.infoValue}>{calculateDOC(cycle.stockingDate)} days</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>Total Seed</Text>
                            <Text style={styles.infoValue}>{cycle.totalSeed.toLocaleString()}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.infoLabel}>Species</Text>
                            <Text style={styles.infoValue}>{cycle.species}</Text>
                        </View>
                    </View>
                </Card>

                <Text style={styles.sectionHeading}>Targets vs Current</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        label="Target Survival"
                        value={`${cycle.targetSurvivalRate || 0}%`}
                    />
                    <MetricCard
                        label="Target FCR"
                        value={cycle.targetFcr || 'N/A'}
                    />
                    <MetricCard
                        label="Target Size"
                        value={`${cycle.targetSizeG || 0}g`}
                    />
                </View>

                {cycle.status === 'active' && (
                    <View style={styles.actionContainer}>
                        <Button
                            title="Record Harvest"
                            onPress={() => {/* Connect later */ }}
                            style={styles.actionBtn}
                        />
                        <Button
                            title="Close Cycle"
                            onPress={handleCloseCycle}
                            variant="outlined"
                            style={[styles.actionBtn, styles.dangerBtn]}
                            textStyle={{ color: Colors.error }}
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
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        marginBottom: spacing.md,
    },
    backBtn: {
        padding: spacing.xs,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    content: {
        paddingBottom: spacing.xxl,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.labelMedium,
        color: Colors.textSecondary,
    },
    sectionCard: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    col: {
        flex: 1,
    },
    infoLabel: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        ...typography.bodyLarge,
        color: Colors.textPrimary,
    },
    sectionHeading: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.sm,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    actionContainer: {
        marginTop: spacing.md,
    },
    actionBtn: {
        marginBottom: spacing.md,
    },
    dangerBtn: {
        borderColor: Colors.error,
    },
});
