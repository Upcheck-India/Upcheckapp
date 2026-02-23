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
