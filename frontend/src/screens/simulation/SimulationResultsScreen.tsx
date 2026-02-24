import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MetricCard } from '../../components/ui/MetricCard';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';

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
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Simulation Results</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MainApp', { screen: 'Dashboard' })} style={styles.backBtn}>
                    <MaterialCommunityIcons name="home-outline" size={24} color={theme.roles.light.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Profit Difference</Text>
                    <Text style={styles.summaryValue}>
                        {(resultData.result?.profitDifference ?? resultData.resultProfitDiff ?? 0) >= 0 ? '+' : ''}
                        {Math.round(resultData.result?.profitDifference ?? resultData.resultProfitDiff ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.summarySubtext}>vs baseline</Text>
                </View>

                <Text style={styles.sectionTitle}>Simulation Results</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        label="Projected Biomass"
                        value={Math.round(resultData.result?.projectedBiomass ?? resultData.resultProjectedBiomass ?? 0).toLocaleString()}
                        unit="kg"
                        status="safe"
                    />
                    <MetricCard
                        label="Projected FCR"
                        value={(resultData.result?.projectedFcr ?? resultData.resultProjectedFcr ?? 0).toFixed(2)}
                    />
                    <MetricCard
                        label="Total Revenue"
                        value={Math.round(resultData.result?.totalRevenue ?? resultData.resultTotalRevenue ?? 0).toLocaleString()}
                    />
                    <MetricCard
                        label="Total Cost"
                        value={Math.round(resultData.result?.totalCost ?? resultData.resultTotalCost ?? 0).toLocaleString()}
                    />
                </View>

                <Card style={styles.inputsCard}>
                    <Text style={styles.sectionTitle}>Profit Comparison</Text>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Baseline Net Profit:</Text>
                        <Text style={styles.paramValue}>{Math.round(resultData.result?.baselineNetProfit ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.paramLabel}>Simulated Net Profit:</Text>
                        <Text style={styles.paramValue}>{Math.round(resultData.result?.simulatedNetProfit ?? resultData.resultNetProfit ?? 0).toLocaleString()}</Text>
                    </View>
                    {(resultData.result?.riskWarning) && (
                        <View style={[styles.row, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.paramLabel, { color: theme.roles.light.dangerText }]}>Risk Warning:</Text>
                            <Text style={[styles.paramValue, { color: theme.roles.light.dangerText, flex: 1, textAlign: 'right' }]}>{resultData.result.riskWarning}</Text>
                        </View>
                    )}
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    summaryContainer: {
        backgroundColor: theme.roles.light.primary,
        padding: theme.spacing[8],
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        marginBottom: theme.spacing[8],
        elevation: 4,
        shadowColor: theme.roles.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    summaryTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.surface,
        opacity: 0.9,
        marginBottom: theme.spacing[2],
    },
    summaryValue: {
        fontSize: 56,
        fontWeight: '800',
        color: theme.roles.light.surface,
    },
    summarySubtext: {
        ...theme.typeScale.h4,
        color: theme.roles.light.surface,
        opacity: 0.9,
        marginTop: -4,
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    inputsCard: {
        backgroundColor: theme.roles.light.surface,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    paramLabel: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    paramValue: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
});
