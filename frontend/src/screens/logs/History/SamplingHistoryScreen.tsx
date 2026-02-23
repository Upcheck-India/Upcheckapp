import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { LineChart } from '../../../components/charts/LineChart';
import { theme } from '../../../theme';
import { samplingApi, SamplingRecord } from '../../../api/sampling';

export const SamplingHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;
    const [records, setRecords] = useState<SamplingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            // Mock filtering if API doesn't have it directly.
            const { data } = await samplingApi.getAll(); // Assuming `getAll()` exists in your samplingApi implementation.
            const pondRecords = data.filter((r: SamplingRecord) => r.pondId === pondId);
            pondRecords.sort((a: SamplingRecord, b: SamplingRecord) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
            setRecords(pondRecords);
        } catch (error) {
            console.log('Failed to fetch sampling records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getChartData = () => {
        const chartRecords = [...records].reverse().slice(-7);
        if (chartRecords.length === 0) return null;
        return {
            labels: chartRecords.map((r: SamplingRecord) => {
                const d = new Date(r.recordedAt);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [
                {
                    data: chartRecords.map((r: SamplingRecord) => r.averageWeightG)
                }
            ]
        };
    };

    // ... rest of the render code is similarly structured as the other history screens
    // Outputting an abstraction here
    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Sampling Growth History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'list' && styles.activeTab]} onPress={() => setActiveTab('list')}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={activeTab === 'list' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'chart' && styles.activeTab]} onPress={() => setActiveTab('chart')}>
                    <MaterialCommunityIcons name="chart-line" size={20} color={activeTab === 'chart' ? theme.roles.light.primary : theme.roles.light.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chart' && styles.activeTabText]}>Growth Chart</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : activeTab === 'list' ? (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Card style={styles.card}>
                            <Text style={styles.dateText}>{new Date(item.recordedAt).toLocaleDateString()}</Text>
                            <Text style={styles.amountText}>{item.averageWeightG} g</Text>
                        </Card>
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={styles.center}><Text>No records.</Text></View>}
                />
            ) : (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>ABW Growth Over Time (g)</Text>
                    {records.length > 0 ? (
                        <LineChart data={getChartData()!} yAxisSuffix="g" />
                    ) : (
                        <View style={styles.center}><Text>Not enough data</Text></View>
                    )}
                </View>
            )}
        </ScreenWrapper>
    );
};

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
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    amountText: { ...theme.typeScale.h4, color: theme.roles.light.primary },
    chartContainer: { flex: 1, padding: theme.spacing[4], alignItems: 'center' },
    chartTitle: { ...theme.typeScale.h4, marginBottom: theme.spacing[6], alignSelf: 'flex-start' },
});
