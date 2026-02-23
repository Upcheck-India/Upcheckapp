import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MetricCard } from '../../components/ui/MetricCard';
import { Card } from '../../components/ui/Card';
import { Colors, typography, spacing, radius } from '../../theme';

export const SimulationResultsScreen = ({ route, navigation }: any) => {
    const { resultData } = route.params;

    if (!resultData) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No simulation data found.</Text>
            </View>
        );
    }

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Simulation Results</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MainApp', { screen: 'Dashboard' })} style={styles.backBtn}>
                    <MaterialCommunityIcons name="home-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Forecasted Culture Duration</Text>
                    <Text style={styles.summaryValue}>{resultData.cultureDurationDays}</Text>
                    <Text style={styles.summarySubtext}>days to reach {resultData.targetAbw}g</Text>
                </View>

                <Text style={styles.sectionTitle}>Expected Outcomes</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        label="Total Harvest"
                        value={resultData.targetBiomassKg.toLocaleString()}
                        unit="kg"
                        status="safe"
                    />
                    <MetricCard
                        label="Est. Total Feed"
                        value={Math.round(resultData.estimatedTotalFeedKg).toLocaleString()}
                        unit="kg"
                    />
                    <MetricCard
                        label="Required Seed"
                        value={resultData.totalSeedRequired.toLocaleString()}
                        unit="PLs"
                    />
                    <MetricCard
                        label="Predicted FCR"
                        value={resultData.estimatedFcr.toFixed(2)}
                    />
                </View>

                <Card style={styles.inputsCard}>
                    <Text style={styles.sectionTitle}>Input Parameters Referenced</Text>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Survival Rate:</Text>
                        <Text style={styles.paramValue}>{resultData.expectedSurvivalRate}%</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Growth (ADG):</Text>
                        <Text style={styles.paramValue}>{resultData.expectedAdg} g/day</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Density:</Text>
                        <Text style={styles.paramValue}>{resultData.stockingDensity} PLs/m²</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Farm Area:</Text>
                        <Text style={styles.paramValue}>{resultData.farmAreaM2.toLocaleString()} m²</Text>
                    </View>
                </Card>
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
        backgroundColor: Colors.surface,
    },
    backBtn: {
        padding: spacing.md,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    summaryContainer: {
        backgroundColor: Colors.primary,
        padding: spacing.xl,
        borderRadius: radius.lg,
        alignItems: 'center',
        marginBottom: spacing.xl,
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    summaryTitle: {
        ...typography.h4,
        color: Colors.surface,
        opacity: 0.9,
        marginBottom: spacing.xs,
    },
    summaryValue: {
        fontSize: 56,
        fontWeight: '800',
        color: Colors.surface,
    },
    summarySubtext: {
        ...typography.h5,
        color: Colors.surface,
        opacity: 0.9,
        marginTop: -4,
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    inputsCard: {
        backgroundColor: Colors.surface,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    paramLabel: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
    },
    paramValue: {
        ...typography.bodyMedium,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
});
