import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { mortalityApi, MortalityRecord } from '../../../api/mortalities';

export const MortalityHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cropId } = route.params;
    const [records, setRecords] = useState<MortalityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchRecords(); }, [cropId]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            if (cropId) {
                const { data } = await mortalityApi.getByCrop(cropId);
                const sorted = [...data].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
                setRecords(sorted);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.log('Failed to fetch mortality records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalMortality = records.reduce((sum, r) => sum + r.quantity, 0);

    const renderItem = ({ item }: { item: MortalityRecord }) => (
        <Card style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                    {new Date(item.recordDate).toLocaleDateString()}
                </Text>
                <View style={styles.countChip}>
                    <MaterialCommunityIcons name="skull-outline" size={14} color={theme.roles.light.dangerText} />
                    <Text style={styles.countText}>{item.quantity}</Text>
                </View>
            </View>
            {item.estimatedWeightKg != null && (
                <Text style={styles.detailText}>Est. Weight: {item.estimatedWeightKg} kg</Text>
            )}
            {item.note && <Text style={styles.notesText}>{item.note}</Text>}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Mortality History</Text>
                <View style={{ width: 40 }} />
            </View>

            {!isLoading && records.length > 0 && (
                <View style={styles.summaryBar}>
                    <Text style={styles.summaryText}>
                        Total Mortality: <Text style={styles.summaryValue}>{totalMortality.toLocaleString()}</Text>
                    </Text>
                </View>
            )}

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="skull-crossbones-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Mortality Logged</Text>
                            <Text style={styles.emptyText}>No mortality data recorded yet.</Text>
                        </View>
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryBar: { backgroundColor: theme.roles.light.dangerBg, paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[4] },
    summaryText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    summaryValue: { fontWeight: '700', color: theme.roles.light.dangerText },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    countChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    countText: { ...theme.typeScale.labelSmall, color: theme.roles.light.dangerText, fontWeight: '700' },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
