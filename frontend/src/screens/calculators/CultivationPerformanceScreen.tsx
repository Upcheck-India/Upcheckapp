import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/ui/MetricCard';
import { theme } from '../../theme';
import {
    calculatorsApi,
    FcrResponse,
    AdgResponse,
    SurvivalRateResponse,
    CultivationPerformanceResponse,
} from '../../api/calculators';

interface PerformanceResults {
    fcr: number | null;
    adg: number | null;
    sr: number | null;
    productivity: number | null;
    perf: CultivationPerformanceResponse | null;
}

export const CultivationPerformanceScreen = ({ navigation }: any) => {
    const [totalSeed, setTotalSeed] = useState('');
    const [totalHarvestKg, setTotalHarvestKg] = useState('');
    const [totalFeedKg, setTotalFeedKg] = useState('');
    const [daysOfCulture, setDaysOfCulture] = useState('');
    const [finalMbwG, setFinalMbwG] = useState('');
    const [finalSrPct, setFinalSrPct] = useState('');
    const [areaM2, setAreaM2] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<PerformanceResults | null>(null);

    const handleCalculate = async () => {
        const seed = parseFloat(totalSeed);
        const harvestKg = parseFloat(totalHarvestKg);
        const feedKg = parseFloat(totalFeedKg);
        const days = parseFloat(daysOfCulture);
        const mbw = parseFloat(finalMbwG);
        const sr = parseFloat(finalSrPct);
        const area = areaM2 ? parseFloat(areaM2) : 0;

        if (!seed || seed <= 0) {
            Alert.alert('Validation Error', 'Total seed must be a positive number');
            return;
        }
        if (!harvestKg || harvestKg <= 0) {
            Alert.alert('Validation Error', 'Total harvested weight must be a positive number');
            return;
        }
        if (!feedKg || feedKg <= 0) {
            Alert.alert('Validation Error', 'Total feed consumed must be a positive number');
            return;
        }
        if (!days || days <= 0) {
            Alert.alert('Validation Error', 'Cultivation days must be a positive number');
            return;
        }
        if (!mbw || mbw <= 0) {
            Alert.alert('Validation Error', 'Final MBW must be a positive number');
            return;
        }
        if (!sr || sr <= 0 || sr > 100) {
            Alert.alert('Validation Error', 'Final SR must be between 0 and 100');
            return;
        }
        if (areaM2 && (area <= 0)) {
            Alert.alert('Validation Error', 'Pond area must be a positive number');
            return;
        }

        setIsLoading(true);
        try {
            const harvestedCount = Math.round(seed * sr / 100);

            const [fcrRes, adgRes, srRes, perfRes] = await Promise.all([
                calculatorsApi.calculateFcr({
                    totalFeedKg: feedKg,
                    harvestWeightKg: harvestKg,
                }),
                calculatorsApi.calculateAdg({
                    initialWeightG: 0,
                    finalWeightG: mbw,
                    daysOfCulture: days,
                }),
                calculatorsApi.calculateSurvivalRate({
                    initialStock: seed,
                    harvestedCount,
                }),
                calculatorsApi.calculateCultivationPerformance({
                    dailyFeed: feedKg / days,
                    fr: (feedKg / days) / ((seed * sr / 100) * mbw / 1000) * 100 || 0,
                    abw: mbw,
                    cumulativeFeed: feedKg,
                    initialStocking: seed,
                }),
            ]);

            const productivity = area > 0 ? harvestKg / area : null;

            setResults({
                fcr: fcrRes.data.fcr,
                adg: adgRes.data.adgG,
                sr: srRes.data.survivalRatePercent,
                productivity,
                perf: perfRes.data,
            });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Calculation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const clearForm = () => {
        setTotalSeed('');
        setTotalHarvestKg('');
        setTotalFeedKg('');
        setDaysOfCulture('');
        setFinalMbwG('');
        setFinalSrPct('');
        setAreaM2('');
        setResults(null);
    };

    const fcrStatus = (v: number): 'safe' | 'warning' | 'critical' => {
        if (v <= 1.5) return 'safe';
        if (v <= 2.0) return 'warning';
        return 'critical';
    };

    const srStatus = (v: number): 'safe' | 'warning' | 'critical' => {
        if (v >= 70) return 'safe';
        if (v >= 50) return 'warning';
        return 'critical';
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Cultivation Performance</Text>
                <TouchableOpacity onPress={clearForm} style={styles.backBtn}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Input Data</Text>
                    <Input
                        label="Total Seed (count)"
                        value={totalSeed}
                        onChangeText={setTotalSeed}
                        keyboardType="number-pad"
                        placeholder="e.g. 500000"
                        required
                    />
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="Total Harvested (kg)"
                                value={totalHarvestKg}
                                onChangeText={setTotalHarvestKg}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="Total Feed (kg)"
                                value={totalFeedKg}
                                onChangeText={setTotalFeedKg}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                required
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="Days of Culture"
                                value={daysOfCulture}
                                onChangeText={setDaysOfCulture}
                                keyboardType="number-pad"
                                placeholder="e.g. 120"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="Final MBW (g)"
                                value={finalMbwG}
                                onChangeText={setFinalMbwG}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 25.0"
                                required
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="Final SR (%)"
                                value={finalSrPct}
                                onChangeText={setFinalSrPct}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 85"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="Pond Area (m²)"
                                value={areaM2}
                                onChangeText={setAreaM2}
                                keyboardType="decimal-pad"
                                placeholder="Optional"
                            />
                        </View>
                    </View>

                    <Button title="Calculate" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {results && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.sectionTitle}>Results</Text>
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                label="FCR"
                                value={results.fcr !== null ? results.fcr.toFixed(2) : 'N/A'}
                                unit="ratio"
                                status={results.fcr !== null ? fcrStatus(results.fcr) : 'normal'}
                            />
                            <MetricCard
                                label="ADG"
                                value={results.adg !== null ? results.adg.toFixed(3) : 'N/A'}
                                unit="g/day"
                            />
                            <MetricCard
                                label="Survival Rate"
                                value={results.sr !== null ? `${results.sr.toFixed(1)}%` : 'N/A'}
                                status={results.sr !== null ? srStatus(results.sr) : 'normal'}
                            />
                            {results.productivity !== null && (
                                <MetricCard
                                    label="Productivity"
                                    value={results.productivity.toFixed(2)}
                                    unit="kg/m²"
                                />
                            )}
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
        paddingHorizontal: theme.spacing[4],
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    clearText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.primary,
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: theme.spacing[3],
    },
    resultsContainer: {
        marginTop: theme.spacing[4],
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
    },
});
