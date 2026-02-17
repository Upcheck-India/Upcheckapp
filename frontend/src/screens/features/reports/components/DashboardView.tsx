import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Avatar, useTheme } from 'react-native-paper';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';
import { DashboardSummary } from '../../../../services/reportsService';

interface Props {
    data: DashboardSummary | null;
    loading: boolean;
}

const SummaryCard = ({ title, value, icon, color, subtitle }: { title: string, value: string | number, icon: string, color: string, subtitle?: string }) => (
    <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Avatar.Icon size={40} icon={icon} style={{ backgroundColor: 'transparent' }} color={color} />
            </View>
            <View style={styles.textContainer}>
                <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>{title}</Text>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>{value}</Text>
                {subtitle && <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{subtitle}</Text>}
            </View>
        </Card.Content>
    </Card>
);

export const DashboardView = ({ data, loading }: Props) => {
    if (loading || !data) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <SummaryCard
                    title="Active Ponds"
                    value={`${data.activePondsCount}/${data.totalPondsCount}`}
                    icon="water"
                    color={Colors.primary}
                />
                <SummaryCard
                    title="Feed Today"
                    value={`${data.todayFeedUsage} kg`}
                    icon="bucket"
                    color={Colors.secondary}
                />
            </View>
            <View style={styles.row}>
                <SummaryCard
                    title="Low Stock Alerts"
                    value={data.lowStockAlerts}
                    icon="alert"
                    color={data.lowStockAlerts > 0 ? Colors.error : Colors.success}
                    subtitle={data.lowStockAlerts > 0 ? "Action Required" : "Stock Healthy"}
                />
                <SummaryCard
                    title="Pending Tasks"
                    value="0"
                    icon="checkbox-marked-circle-outline"
                    color={Colors.textSecondary}
                    subtitle="Coming Soon"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: Layout.padding,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    card: {
        width: '48%',
        backgroundColor: Colors.surface,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    iconContainer: {
        borderRadius: 8,
        padding: 4,
        marginBottom: 8,
    },
    textContainer: {}
});
