import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { HarvestService } from '../../services/harvestService';
import { HarvestCycleSummary, HarvestPlan } from '../../types/harvest';

const HarvestPlanningScreen = () => {
    const [pondId, setPondId] = useState('');
    const [farmId, setFarmId] = useState('');
    const [cropId, setCropId] = useState('');
    const [plannedHarvestDate, setPlannedHarvestDate] = useState('');
    const [targetWeightKg, setTargetWeightKg] = useState('');
    const [expectedPricePerKg, setExpectedPricePerKg] = useState('');
    const [notes, setNotes] = useState('');

    const [actualHarvestDate, setActualHarvestDate] = useState('');
    const [actualWeightKg, setActualWeightKg] = useState('');
    const [actualPricePerKg, setActualPricePerKg] = useState('');

    const [currentPlan, setCurrentPlan] = useState<HarvestPlan | null>(null);
    const [summary, setSummary] = useState<HarvestCycleSummary | null>(null);
    const [loading, setLoading] = useState(false);

    const expectedRevenue = useMemo(() => {
        const weight = Number(targetWeightKg);
        const price = Number(expectedPricePerKg);
        if (!weight || !price) return 0;
        return weight * price;
    }, [targetWeightKg, expectedPricePerKg]);

    const actualRevenue = useMemo(() => {
        const weight = Number(actualWeightKg);
        const price = Number(actualPricePerKg);
        if (!weight || !price) return 0;
        return weight * price;
    }, [actualWeightKg, actualPricePerKg]);

    const handlePlan = async () => {
        if (!pondId) {
            Alert.alert('Validation', 'Please enter a pond ID');
            return;
        }
        setLoading(true);
        try {
            const plan = await HarvestService.createPlan({
                pondId,
                cropId: cropId || undefined,
                plannedHarvestDate: plannedHarvestDate || undefined,
                targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
                expectedPricePerKg: expectedPricePerKg ? Number(expectedPricePerKg) : undefined,
                expectedRevenue: expectedRevenue || undefined,
                notes: notes || undefined,
            });
            setCurrentPlan(plan);
        } catch (error) {
            Alert.alert('Error', 'Failed to save harvest plan');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!currentPlan || !farmId) {
            Alert.alert('Validation', 'Plan and farm ID required');
            return;
        }
        setLoading(true);
        try {
            const updated = await HarvestService.completePlan({
                planId: currentPlan.id,
                farmId,
                cropId: cropId || undefined,
                actualHarvestDate,
                actualWeightKg: Number(actualWeightKg),
                actualPricePerKg: Number(actualPricePerKg),
            });
            setCurrentPlan(updated);
            const summaryData = await HarvestService.getSummary(pondId, farmId);
            setSummary(summaryData);
        } catch (error) {
            Alert.alert('Error', 'Failed to complete harvest plan');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchSummary = async () => {
        if (!pondId || !farmId) {
            Alert.alert('Validation', 'Pond ID and Farm ID required');
            return;
        }
        setLoading(true);
        try {
            const summaryData = await HarvestService.getSummary(pondId, farmId);
            setSummary(summaryData);
            if (summaryData.latestPlan) {
                setCurrentPlan(summaryData.latestPlan);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch summary');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Harvest Planning</Text>

                <Card style={styles.card}>
                    <Card.Title title="Baseline" subtitle="Identify pond and farm" />
                    <Card.Content>
                        <TextInput label="Pond ID" value={pondId} onChangeText={setPondId} mode="outlined" style={styles.input} />
                        <TextInput label="Farm ID" value={farmId} onChangeText={setFarmId} mode="outlined" style={styles.input} />
                        <TextInput label="Crop ID (optional)" value={cropId} onChangeText={setCropId} mode="outlined" style={styles.input} />
                        <Button mode="outlined" onPress={handleFetchSummary} loading={loading}>
                            Load Latest Plan & Summary
                        </Button>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Title title="Plan Harvest" subtitle="Estimate your harvest revenue" />
                    <Card.Content>
                        <TextInput label="Planned Harvest Date (YYYY-MM-DD)" value={plannedHarvestDate} onChangeText={setPlannedHarvestDate} mode="outlined" style={styles.input} />
                        <TextInput label="Target Weight (kg)" value={targetWeightKg} onChangeText={setTargetWeightKg} mode="outlined" keyboardType="numeric" style={styles.input} />
                        <TextInput label="Expected Price (₹/kg)" value={expectedPricePerKg} onChangeText={setExpectedPricePerKg} mode="outlined" keyboardType="numeric" style={styles.input} />
                        <TextInput label="Notes" value={notes} onChangeText={setNotes} mode="outlined" style={styles.input} />

                        <View style={styles.summaryRow}>
                            <Text>Projected Revenue</Text>
                            <Text style={styles.summaryValue}>₹{expectedRevenue.toFixed(0)}</Text>
                        </View>

                        <Button mode="contained" onPress={handlePlan} loading={loading}>
                            Save Harvest Plan
                        </Button>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Title title="Complete Harvest" subtitle="Log actual results" />
                    <Card.Content>
                        <TextInput label="Actual Harvest Date (YYYY-MM-DD)" value={actualHarvestDate} onChangeText={setActualHarvestDate} mode="outlined" style={styles.input} />
                        <TextInput label="Actual Weight (kg)" value={actualWeightKg} onChangeText={setActualWeightKg} mode="outlined" keyboardType="numeric" style={styles.input} />
                        <TextInput label="Actual Price (₹/kg)" value={actualPricePerKg} onChangeText={setActualPricePerKg} mode="outlined" keyboardType="numeric" style={styles.input} />

                        <View style={styles.summaryRow}>
                            <Text>Actual Revenue</Text>
                            <Text style={styles.summaryValue}>₹{actualRevenue.toFixed(0)}</Text>
                        </View>

                        <Button mode="contained" onPress={handleComplete} loading={loading} disabled={!currentPlan}>
                            Complete Harvest & Log Income
                        </Button>
                    </Card.Content>
                </Card>

                {summary && (
                    <Card style={styles.resultCard}>
                        <Card.Title title="Cycle Summary" subtitle="End-of-cycle financials" />
                        <Card.Content>
                            <View style={styles.summaryRow}>
                                <Text>Total Revenue</Text>
                                <Text style={styles.summaryValue}>₹{summary.totalRevenue.toFixed(0)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text>Total Expense</Text>
                                <Text style={styles.summaryValue}>₹{summary.totalExpense.toFixed(0)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text>Net Profit</Text>
                                <Text style={styles.summaryValue}>₹{summary.netProfit.toFixed(0)}</Text>
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {currentPlan && (
                    <Card style={styles.card}>
                        <Card.Title title="Latest Plan" subtitle={currentPlan.status} />
                        <Card.Content>
                            <Text>Planned Date: {currentPlan.planned_harvest_date || 'N/A'}</Text>
                            <Text>Target Weight: {currentPlan.target_weight_kg || 0} kg</Text>
                            <Text>Expected Revenue: ₹{currentPlan.expected_revenue || 0}</Text>
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Layout.padding,
        paddingBottom: 32,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
        color: Colors.primaryDark,
        fontWeight: '600',
    },
    card: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryValue: {
        fontWeight: '700',
        color: Colors.primaryDark,
    },
    resultCard: {
        borderTopWidth: 4,
        borderTopColor: Colors.secondaryDark,
    },
});

export default HarvestPlanningScreen;
