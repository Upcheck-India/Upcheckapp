import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { FinancialReport, ReportsService } from '../../../../services/reportsService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

interface Props {
    farmId: string;
}

export const FinancialReportView = ({ farmId }: Props) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FinancialReport | null>(null);
    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        if (farmId) {
            fetchData();
        }
    }, [farmId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await ReportsService.getFinancialReport(farmId);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
    if (!data) return <View style={styles.center}><Text>No data available</Text></View>;

    // Prepare Pie Chart Data
    const pieData = data.expensesByCategory.map((item, index) => {
        const colors = [Colors.primary, Colors.secondary, Colors.accent, Colors.warning, Colors.error];
        return {
            name: item.category,
            amount: item.amount,
            color: colors[index % colors.length],
            legendFontColor: Colors.textSecondary,
            legendFontSize: 12
        };
    });

    return (
        <ScrollView style={styles.container}>
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Revenue</Text>
                    <Text variant="titleLarge" style={{ color: Colors.success, fontWeight: 'bold' }}>₹{data.revenue.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryItem, styles.borderLeft]}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Expenses</Text>
                    <Text variant="titleLarge" style={{ color: Colors.error, fontWeight: 'bold' }}>₹{data.totalExpenses.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryItem, styles.borderLeft]}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Profit</Text>
                    <Text variant="titleLarge" style={{ color: data.profit >= 0 ? Colors.primary : Colors.error, fontWeight: 'bold' }}>
                        ₹{data.profit.toLocaleString()}
                    </Text>
                </View>
            </View>

            <Text variant="titleMedium" style={styles.chartTitle}>Expenses by Category</Text>
            <PieChart
                data={pieData}
                width={screenWidth - Layout.padding * 2}
                height={220}
                chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"amount"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
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
    summaryRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        elevation: 1,
        justifyContent: 'space-between'
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    borderLeft: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.divider,
    },
    chartTitle: {
        marginBottom: 8,
        fontWeight: 'bold',
        color: Colors.text
    },
});
