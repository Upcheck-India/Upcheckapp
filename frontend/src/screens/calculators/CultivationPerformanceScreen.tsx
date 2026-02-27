import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/ui/MetricCard';
import { theme } from '../../theme';
import { calculatorsApi, CultivationPerformanceResponse } from '../../api/calculators';

export const CultivationPerformanceScreen = ({ navigation }: any) => {
    const [initialCount, setInitialCount] = useState('');
    const [totalHarvestKg, setTotalHarvestKg] = useState('');
    const [totalFeedKg, setTotalFeedKg] = useState('');
    const [daysOfCulture, setDaysOfCulture] = useState('');
    const [areaM2, setAreaM2] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CultivationPerformanceResponse | null>(null);

    const handleCalculate = async () => {
        if (!initialCount || !totalHarvestKg || !totalFeedKg || !daysOfCulture) {
            Alert.alert('Validation Error', 'Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculatePerformance({
                initialCount: parseFloat(initialCount),
                totalHarvestKg: parseFloat(totalHarvestKg),
                totalFeedKg: parseFloat(totalFeedKg),
                daysOfCulture: parseFloat(daysOfCulture),
                areaM2: areaM2 ? parseFloat(areaM2) : undefined,
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Calculation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const clearForm = () => {
        setInitialCount('');
        setTotalHarvestKg('');
        setTotalFeedKg('');
        setDaysOfCulture('');
        setAreaM2('');
        setResult(null);
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Performance Calculator</Text>
                <TouchableOpacity onPress={clearForm} style={styles.backBtn}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Input Data</Text>
                    <Input label="Initial Seed Count *" value={initialCount} onChangeText={setInitialCount} keyboardType="number-pad" placeholder="e.g. 500000" />
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Total Harvest (kg) *" value={totalHarvestKg} onChangeText={setTotalHarvestKg} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Total Feed (kg) *" value={totalFeedKg} onChangeText={setTotalFeedKg} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Days of Culture *" value={daysOfCulture} onChangeText={setDaysOfCulture} keyboardType="number-pad" placeholder="e.g. 120" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Pond Area (m²)" value={areaM2} onChangeText={setAreaM2} keyboardType="decimal-pad" placeholder="Optional" />
                        </View>
                    </View>

                    <Button title="Calculate" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {result && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.sectionTitle}>Results</Text>
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                label="FCR"
                                value={result.fcr.toFixed(2)}
                                status={result.fcr > 1.5 ? 'warning' : 'safe'}
                            />
                            <MetricCard
                                label="Survival Rate"
                                value={result.survivalRate !== null ? `${result.survivalRate.toFixed(1)}%` : 'N/A'}
                                status={(result.survivalRate ?? 0) < 60 ? 'warning' : 'safe'}
                            />
                            <MetricCard
                                label="ADG"
                                value={result.adg !== null ? `${result.adg.toFixed(2)}` : 'N/A'}
                                unit="g/day"
                            />
                            <MetricCard
                                label="MBW / ABW"
                                value={result.abw !== null ? `${result.abw.toFixed(1)}` : 'N/A'}
                                unit="g"
                            />
                            {result.productivity !== null && (
                                <MetricCard
                                    label="Productivity"
                                    value={result.productivity.toFixed(2)}
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
