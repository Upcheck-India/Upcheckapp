import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, SegmentedButtons, Text, Menu, useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { BarChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { SimulationService } from '../../services/simulationService';
import { PondService } from '../../services/pondService';
import { SimulationScenarioType } from '../../types/simulation';

const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    fillShadowGradientFrom: Colors.accent,
    fillShadowGradientTo: Colors.primary,
    color: (opacity = 1) => Colors.primary,
    labelColor: () => Colors.textSecondary,
    decimalPlaces: 0,
    barPercentage: 0.7,
};

const scenarioOptions = [
    { value: 'feed_change', label: 'Feed Switch' },
    { value: 'price_change', label: 'Market Price' },
    { value: 'stocking_density', label: 'Stocking Density' },
];

const SimulationScreen = () => {
    const theme = useTheme();
    const [pondId, setPondId] = useState('');
    const [selectedPondName, setSelectedPondName] = useState('');
    const [ponds, setPonds] = useState<any[]>([]);
    const [menuVisible, setMenuVisible] = useState(false);

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

    useEffect(() => {
        loadPonds();
    }, []);

    const loadPonds = async () => {
        try {
            const data = await PondService.fetchAllUserPonds();
            setPonds(data);
            if (data.length > 0) {
                setPondId(data[0].id);
                setSelectedPondName(`${data[0].name} (${data[0].farm?.name})`);
            }
        } catch (error) {
            console.error('Failed to load ponds', error);
        }
    };

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
            alert('Please select a pond');
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
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Farm Simulation</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                        Project future outcomes based on variables
                    </Text>
                </View>

                <AppCard style={styles.card} elevation={2}>
                    <View style={styles.cardHeader}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Baseline Pond</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    onPress={() => setMenuVisible(true)}
                                    style={styles.dropdown}
                                    textColor={Colors.primary}
                                >
                                    {selectedPondName || 'Select Pond'}
                                </Button>
                            }
                        >
                            {ponds.map((pond) => (
                                <Menu.Item
                                    key={pond.id}
                                    onPress={() => {
                                        setPondId(pond.id);
                                        setSelectedPondName(`${pond.name} (${pond.farm?.name})`);
                                        setMenuVisible(false);
                                    }}
                                    title={`${pond.name} - ${pond.farm?.name}`}
                                />
                            ))}
                        </Menu>
                        <SegmentedButtons
                            value={scenarioType}
                            onValueChange={(value) => setScenarioType(value as SimulationScenarioType)}
                            buttons={scenarioOptions}
                            style={styles.segmentedButton}
                            theme={{ colors: { secondaryContainer: Colors.primary + '20' } }}
                        />
                    </View>
                </AppCard>

                {scenarioType === 'feed_change' && (
                    <AppCard style={styles.card} elevation={2}>
                        <View style={styles.cardHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Feed Switch Variables</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.sliderLabel}>Feed price (₹/kg): <Text style={{ fontWeight: 'bold' }}>{feedPrice.toFixed(0)}</Text></Text>
                            <Slider
                                minimumValue={20}
                                maximumValue={120}
                                step={1}
                                value={feedPrice}
                                onValueChange={setFeedPrice}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primary}
                            />
                            <Text style={styles.sliderLabel}>Growth improvement (%): <Text style={{ fontWeight: 'bold' }}>{growthImprovement.toFixed(0)}%</Text></Text>
                            <Slider
                                minimumValue={-10}
                                maximumValue={20}
                                step={1}
                                value={growthImprovement}
                                onValueChange={setGrowthImprovement}
                                minimumTrackTintColor={Colors.accent}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.accent}
                            />
                        </View>
                    </AppCard>
                )}

                {scenarioType === 'price_change' && (
                    <AppCard style={styles.card} elevation={2}>
                        <View style={styles.cardHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Market Price Variables</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.sliderLabel}>Selling price (₹/kg): <Text style={{ fontWeight: 'bold' }}>{sellingPrice.toFixed(0)}</Text></Text>
                            <Slider
                                minimumValue={200}
                                maximumValue={700}
                                step={5}
                                value={sellingPrice}
                                onValueChange={setSellingPrice}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primary}
                            />
                        </View>
                    </AppCard>
                )}

                {scenarioType === 'stocking_density' && (
                    <AppCard style={styles.card} elevation={2}>
                        <View style={styles.cardHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Stocking Density Variables</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.sliderLabel}>Density (shrimp/m²): <Text style={{ fontWeight: 'bold' }}>{stockingDensity.toFixed(0)}</Text></Text>
                            <Slider
                                minimumValue={10}
                                maximumValue={200}
                                step={1}
                                value={stockingDensity}
                                onValueChange={setStockingDensity}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.lightGrey}
                                thumbTintColor={Colors.primary}
                            />
                        </View>
                    </AppCard>
                )}

                <Button
                    mode="contained"
                    onPress={handleSimulate}
                    loading={loading}
                    style={styles.simulateButton}
                    contentStyle={{ height: 50 }}
                >
                    Run Simulation
                </Button>

                {result && (
                    <AppCard style={styles.resultCard} elevation={4}>
                        <View style={styles.cardHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Projected Profitability</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Current</Text>
                                    <Text variant="titleLarge" style={styles.summaryValue}>₹{result.baselineNetProfit.toFixed(0)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Simulated</Text>
                                    <Text variant="titleLarge" style={[styles.summaryValue, { color: profitBarColor }]}>₹{result.simulatedNetProfit.toFixed(0)}</Text>
                                </View>
                            </View>

                            <View style={styles.diffContainer}>
                                <Text variant="bodyMedium">Net Difference: </Text>
                                <Text variant="titleMedium" style={{ color: profitBarColor, fontWeight: 'bold' }}>
                                    {result.profitDifference > 0 ? '+' : ''}₹{result.profitDifference.toFixed(0)}
                                </Text>
                            </View>

                            {data && (
                                <BarChart
                                    data={data}
                                    width={Layout.window.width - Layout.padding * 4}
                                    height={220}
                                    fromZero
                                    withCustomBarColorFromData
                                    flatColor
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    chartConfig={chartConfig}
                                    style={styles.chart}
                                />
                            )}

                            {result.riskWarning && (
                                <View style={styles.warningContainer}>
                                    <Text style={styles.warningText}>⚠️ {result.riskWarning}</Text>
                                </View>
                            )}
                        </View>
                    </AppCard>
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
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        color: Colors.primaryDark,
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 16,
        padding: 0, // AppCard handles padding? No, AppCard wraps Card which has content.
        // Actually AppCard just styles the container. We need to manage padding inside title/content
        overflow: 'hidden',
    },
    cardHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    cardContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        color: Colors.text,
    },
    dropdown: {
        borderColor: Colors.primary,
        marginBottom: 12,
    },
    segmentedButton: {
        marginTop: 8,
    },
    input: {
        marginBottom: 12,
    },
    sliderLabel: {
        marginTop: 12,
        marginBottom: 4,
        color: Colors.textSecondary,
    },
    simulateButton: {
        marginVertical: 16,
        borderRadius: 25, // Pill shape
    },
    resultCard: {
        marginTop: 8,
        borderLeftWidth: 6,
        borderLeftColor: Colors.accent,
    },
    chart: {
        marginTop: 24,
        borderRadius: 16,
        alignSelf: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: 12,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontWeight: 'bold',
    },
    diffContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningContainer: {
        marginTop: 16,
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
    },
    warningText: {
        color: Colors.error,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default SimulationScreen;
