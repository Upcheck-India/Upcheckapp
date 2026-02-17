import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { ExpensesService } from '../../../services/expensesService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
// import { PieChart } from 'react-native-chart-kit'; // Consider adding later
import { Dimensions } from 'react-native';

const FinancialSummaryCard = ({ cropId, refreshTrigger }: { cropId: string, refreshTrigger?: number }) => {
    const [financials, setFinancials] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFinancials();
    }, [cropId, refreshTrigger]);

    const loadFinancials = async () => {
        try {
            const data = await ExpensesService.getCycleFinancials(cropId);
            setFinancials(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ padding: 20 }} />;
    if (!financials) return null;

    const { totalRevenue, totalExpenses, netProfit, marginPercent, expensesByCategory } = financials;
    const isProfitable = netProfit >= 0;

    return (
        <View style={styles.card}>
            <Text variant="titleMedium" style={styles.title}>Financial Summary</Text>

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text variant="labelMedium" style={styles.label}>Revenue</Text>
                    <Text variant="bodyLarge" style={[styles.value, { color: Colors.success }]}>
                        Rp {totalRevenue.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.col}>
                    <Text variant="labelMedium" style={styles.label}>Expenses</Text>
                    <Text variant="bodyLarge" style={[styles.value, { color: Colors.error }]}>
                        Rp {totalExpenses.toLocaleString()}
                    </Text>
                </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text variant="labelMedium" style={styles.label}>Net Profit/Loss</Text>
                    <Text variant="headlineSmall" style={[styles.value, { color: isProfitable ? Colors.success : Colors.error }]}>
                        {isProfitable ? '+' : ''} Rp {netProfit.toLocaleString()}
                    </Text>
                    <Text variant="bodySmall" style={{ color: isProfitable ? Colors.success : Colors.error }}>
                        Margin: {marginPercent.toFixed(1)}%
                    </Text>
                </View>
            </View>

            <Divider style={styles.divider} />

            <Text variant="labelMedium" style={[styles.label, { marginBottom: 8 }]}>Expense Breakdown</Text>
            {Object.entries(expensesByCategory).map(([category, amount]: [string, any]) => (
                <View key={category} style={styles.breakdownRow}>
                    <Text variant="bodySmall">{category}</Text>
                    <Text variant="bodySmall">Rp {amount.toLocaleString()}</Text>
                </View>
            ))}

        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    title: { fontWeight: 'bold', marginBottom: 16, color: Colors.text },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    col: { flex: 1 },
    label: { color: Colors.textTertiary },
    value: { fontWeight: 'bold' },
    divider: { marginVertical: 12 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }
});

export default FinancialSummaryCard;
