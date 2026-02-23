import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { BarChart } from '../../../components/charts/BarChart';
import { theme } from '../../../theme';
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
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Feed History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'list' && styles.activeTab]} onPress={() => setActiveTab('list')}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={activeTab === 'list' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'chart' && styles.activeTab]} onPress={() => setActiveTab('chart')}>
                    <MaterialCommunityIcons name="chart-bar" size={20} color={activeTab === 'chart' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chart' && styles.activeTabText]}>Chart</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault, backgroundColor: theme.roles.light.surface },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing[4], gap: theme.spacing[3], borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: theme.roles.light.primary },
    tabText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    activeTabText: { color: theme.roles.light.primary, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4] },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    amountText: { ...theme.typeScale.h4, color: theme.roles.light.primary },
    typeText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginTop: 4 },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[3], fontStyle: 'italic' },
    fastingBadge: { backgroundColor: theme.roles.light.warningText + '20', paddingHorizontal: theme.spacing[3], paddingVertical: 2, borderRadius: theme.radius.sm },
    fastingText: { color: theme.roles.light.warningText, ...theme.typeScale.labelMedium },
    chartContainer: { flex: 1, padding: theme.spacing[4], alignItems: 'center' },
    chartTitle: { ...theme.typeScale.h4, marginBottom: theme.spacing[6], alignSelf: 'flex-start' },
});
