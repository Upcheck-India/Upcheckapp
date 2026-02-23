import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { BarChart } from '../../../components/charts/BarChart';
import { Colors, typography, spacing, radius } from '../../../theme';
import { feedApi, FeedRecord } from '../../../api/feedRecords';

export const FeedHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [records, setRecords] = useState<FeedRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await feedApi.getAll();
            const pondRecords = data.filter(r => r.pondId === pondId);
            pondRecords.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
            setRecords(pondRecords);
        } catch (error) {
            console.log('Failed to fetch Feed records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getChartData = () => {
        const chartRecords = [...records].reverse().slice(-7);
        if (chartRecords.length === 0) return null;
        return {
            labels: chartRecords.map(r => {
                const d = new Date(r.recordedAt);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [
                {
                    data: chartRecords.map(r => r.totalAmountKg)
                }
            ]
        };
    };

    const renderItem = ({ item }: { item: FeedRecord }) => (
        <Card style={styles.card}>
            <View style={styles.rowBetween}>
                <Text style={styles.dateText}>
                    {new Date(item.recordedAt).toLocaleDateString()}
                </Text>
                {item.wasFasting ? (
                    <View style={styles.fastingBadge}>
                        <Text style={styles.fastingText}>Fasting</Text>
                    </View>
                ) : (
                    <Text style={styles.amountText}>{item.totalAmountKg} kg</Text>
                )}
            </View>
            {!item.wasFasting && item.feedType && (
                <Text style={styles.typeText}>Type: {item.feedType}</Text>
            )}
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Feed History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'list' && styles.activeTab]} onPress={() => setActiveTab('list')}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={activeTab === 'list' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'chart' && styles.activeTab]} onPress={() => setActiveTab('chart')}>
                    <MaterialCommunityIcons name="chart-bar" size={20} color={activeTab === 'chart' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chart' && styles.activeTabText]}>Chart</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : activeTab === 'list' ? (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={styles.center}><Text>No feed records.</Text></View>}
                />
            ) : (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Daily Feed Distribution (Last 7 Logs)</Text>
                    {records.length > 0 ? (
                        <BarChart data={getChartData()!} yAxisSuffix="kg" />
                    ) : (
                        <View style={styles.center}><Text>Not enough data</Text></View>
                    )}
                </View>
            )}
        </ScreenWrapper>
    );
};

// Assuming style definitions are extremely similar to the WQ history screen styling
const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: spacing.md },
    title: { ...typography.h3, color: Colors.textPrimary },
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.surface },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { ...typography.labelLarge, color: Colors.textSecondary },
    activeTabText: { color: Colors.primary, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md },
    card: { padding: spacing.md, marginBottom: spacing.sm },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    dateText: { ...typography.labelLarge, color: Colors.textPrimary },
    amountText: { ...typography.h4, color: Colors.primary },
    typeText: { ...typography.bodyMedium, color: Colors.textSecondary, marginTop: 4 },
    notesText: { ...typography.bodySmall, color: Colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
    fastingBadge: { backgroundColor: Colors.warning + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
    fastingText: { color: Colors.warning, ...typography.labelMedium },
    chartContainer: { flex: 1, padding: spacing.md, alignItems: 'center' },
    chartTitle: { ...typography.h4, marginBottom: spacing.lg, alignSelf: 'flex-start' },
});
