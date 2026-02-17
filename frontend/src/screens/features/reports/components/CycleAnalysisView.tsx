import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { CycleAnalysis, ReportsService } from '../../../../services/reportsService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

interface Props {
    cycleId: string | null;
}

export const CycleAnalysisView = ({ cycleId }: Props) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CycleAnalysis | null>(null);
    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        if (cycleId) {
            fetchAnalysis();
        }
    }, [cycleId]);

    const fetchAnalysis = async () => {
        if (!cycleId) return;
        setLoading(true);
        try {
            const result = await ReportsService.getCycleAnalysis(cycleId);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!cycleId) {
        return <View style={styles.center}><Text>Select a cycle to view analysis</Text></View>;
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator /></View>;
    }

    if (!data) {
        return <View style={styles.center}><Text>No data available</Text></View>;
    }

    // Prepare chart data
    const labels = data.growthChart.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const dataset = data.growthChart.map(d => d.mbw);

    const chartData = {
        labels: labels,
        datasets: [
            {
                data: dataset,
                color: (opacity = 1) => `rgba(0, 165, 204, ${opacity})`, // Colors.primary
                strokeWidth: 2
            }
        ],
        legend: ["MBW Growth (g)"]
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>FCR</Text>
                    <Text variant="headlineMedium" style={{ color: Colors.text, fontWeight: 'bold' }}>{data.fcr}</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Survival Rate</Text>
                    <Text variant="headlineMedium" style={{ color: Colors.success, fontWeight: 'bold' }}>{data.survivalRate}%</Text>
                </View>
            </View>

            <Text variant="titleMedium" style={styles.chartTitle}>Growth Curve</Text>
            <LineChart
                data={chartData}
                width={screenWidth - (Layout.padding * 2)}
                height={220}
                chartConfig={{
                    backgroundColor: Colors.surface,
                    backgroundGradientFrom: Colors.surface,
                    backgroundGradientTo: Colors.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 165, 204, ${opacity})`,
                    labelColor: (opacity = 1) => Colors.textSecondary,
                    propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: Colors.primary
                    }
                }}
                bezier
                style={styles.chart}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Layout.padding,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    metricCard: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 8,
        elevation: 1,
        minWidth: 100,
    },
    chartTitle: {
        marginBottom: 8,
        fontWeight: 'bold',
        color: Colors.text
    },
    chart: {
        borderRadius: 8,
        marginVertical: 8,
    }
});
