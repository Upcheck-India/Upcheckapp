import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { BarChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { SimulationService } from '../../services/simulationService';
import { SimulationScenarioType } from '../../types/simulation';

const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
    labelColor: () => Colors.text,
    decimalPlaces: 0,
};

const scenarioOptions = [
    { value: 'feed_change', label: 'Feed Switch' },
    { value: 'price_change', label: 'Market Price' },
    { value: 'stocking_density', label: 'Stocking Density' },
];

const SimulationScreen = () => {
    const [pondId, setPondId] = useState('');
    const [scenarioType, setScenarioType] = useState<SimulationScenarioType>('feed_change');
    const [feedPrice, setFeedPrice] = useState(0);
    const [growthImprovement, setGrowthImprovement] = useState(0);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [stockingDensity, setStockingDensity] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<null | {
        baselineNetProfit: number;
        simulatedNetProfit: number;
        profitDifference: number;
        projectedBiomass: number;
        projectedFcr: number;
        totalRevenue: number;
        totalCost: number;
        riskWarning?: string;
    }>(null);

    const profitBarColor = result?.profitDifference && result.profitDifference < 0 ? Colors.error : Colors.success;

    const data = useMemo(() => {
        if (!result) return null;
        return {
            labels: ['Current', 'Simulated'],
            datasets: [
                {
                    data: [result.baselineNetProfit, result.simulatedNetProfit],
                    colors: [(opacity = 1) => Colors.grey, () => profitBarColor],
                },
            ],
        };
    }, [result, profitBarColor]);

    const handleSimulate = async () => {
        if (!pondId) {
            alert('Please enter a pond ID');
            return;
        }

        setLoading(true);
        try {
            const response = await SimulationService.runSimulation({
                pondId,
                scenarioType,
                variables: {
                    feedPrice: scenarioType === 'feed_change' ? feedPrice : undefined,
                    growthImprovement: scenarioType === 'feed_change' ? growthImprovement : undefined,
                    sellingPrice: scenarioType === 'price_change' ? sellingPrice : undefined,
                    stockingDensity: scenarioType === 'stocking_density' ? stockingDensity : undefined,
                },
            });
            setResult(response.result);
        } catch (error) {
            alert('Failed to run simulation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Farm Simulation</Text>

                <Card style={styles.card}>
                    <Card.Title title="Baseline" subtitle="Select a pond to simulate" />
                    <Card.Content>
                        <TextInput
                            label="Pond ID"
                            value={pondId}
                            onChangeText={setPondId}
                            mode="outlined"
                            style={styles.input}
                        />
                        <SegmentedButtons
                            value={scenarioType}
                            onValueChange={(value) => setScenarioType(value as SimulationScenarioType)}
                            buttons={scenarioOptions}
                        />
                    </Card.Content>
                </Card>

                {scenarioType === 'feed_change' && (
                    <Card style={styles.card}>
                        <Card.Title title="Feed Switch" subtitle="Adjust feed cost and growth" />
                        <Card.Content>
                            <Text style={styles.sliderLabel}>Feed price (₹/kg): {feedPrice.toFixed(0)}</Text>
                            <Slider
                                minimumValue={20}
                                maximumValue={120}
                                step={1}
                                value={feedPrice}
                                onValueChange={setFeedPrice}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primaryDark}
                            />
                            <Text style={styles.sliderLabel}>Growth improvement (%): {growthImprovement.toFixed(0)}</Text>
                            <Slider
                                minimumValue={-10}
                                maximumValue={20}
                                step={1}
                                value={growthImprovement}
                                onValueChange={setGrowthImprovement}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primaryDark}
                            />
                        </Card.Content>
                    </Card>
                )}

                {scenarioType === 'price_change' && (
                    <Card style={styles.card}>
                        <Card.Title title="Market Price" subtitle="Adjust expected selling price" />
                        <Card.Content>
                            <Text style={styles.sliderLabel}>Selling price (₹/kg): {sellingPrice.toFixed(0)}</Text>
                            <Slider
                                minimumValue={200}
                                maximumValue={700}
                                step={5}
                                value={sellingPrice}
                                onValueChange={setSellingPrice}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primaryDark}
                            />
                        </Card.Content>
                    </Card>
                )}

                {scenarioType === 'stocking_density' && (
                    <Card style={styles.card}>
                        <Card.Title title="Stocking Density" subtitle="Assess density risk" />
                        <Card.Content>
                            <Text style={styles.sliderLabel}>Density (shrimp/m²): {stockingDensity.toFixed(0)}</Text>
                            <Slider
                                minimumValue={10}
                                maximumValue={200}
                                step={1}
                                value={stockingDensity}
                                onValueChange={setStockingDensity}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primaryDark}
                            />
                        </Card.Content>
                    </Card>
                )}

                <Button mode="contained" onPress={handleSimulate} loading={loading} style={styles.simulateButton}>
                    Simulate
                </Button>

                {result && (
                    <Card style={styles.resultCard}>
                        <Card.Title title="Comparison" subtitle="Projected profitability" />
                        <Card.Content>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text variant="titleSmall">Current Profit</Text>
                                    <Text style={styles.summaryValue}>₹{result.baselineNetProfit.toFixed(0)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text variant="titleSmall">Simulated Profit</Text>
                                    <Text style={[styles.summaryValue, { color: profitBarColor }]}>₹{result.simulatedNetProfit.toFixed(0)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text variant="titleSmall">Difference</Text>
                                    <Text style={[styles.summaryValue, { color: profitBarColor }]}>₹{result.profitDifference.toFixed(0)}</Text>
                                </View>
                            </View>

                            {data && (
                                <BarChart
                                    data={data}
                                    width={Layout.window.width - Layout.padding * 2}
                                    height={220}
                                    fromZero
                                    withCustomBarColorFromData
                                    flatColor
                                    chartConfig={chartConfig}
                                    style={styles.chart}
                                />
                            )}

                            {result.riskWarning && (
                                <Text style={styles.warningText}>{result.riskWarning}</Text>
                            )}
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
    sliderLabel: {
        marginTop: 8,
        marginBottom: 4,
        color: Colors.textSecondary,
    },
    simulateButton: {
        marginVertical: 8,
    },
    resultCard: {
        marginTop: 16,
        borderTopWidth: 4,
        borderTopColor: Colors.primary,
    },
    chart: {
        marginTop: 16,
        borderRadius: Layout.borderRadius,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryItem: {
        flex: 1,
    },
    summaryValue: {
        fontWeight: '700',
        marginTop: 4,
    },
    warningText: {
        marginTop: 12,
        color: Colors.error,
        fontWeight: '600',
    },
});

export default SimulationScreen;
