import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { Colors, typography, spacing, radius } from '../../../theme';
import { harvestsApi, HarvestRecord } from '../../../api/harvests';

export const HarvestHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cycleId } = route.params;
    const [records, setRecords] = useState<HarvestRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await harvestsApi.getAll();
            // Strictly map by both pond and cycle if applicable, filtering by pondId for now
            const pondRecords = data.filter((r: HarvestRecord) => r.pondId === pondId);
            pondRecords.sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());
            setRecords(pondRecords);
        } catch (error) {
            console.log('Failed to fetch harvest records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: HarvestRecord }) => (
        <Card style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                    {new Date(item.harvestDate).toLocaleDateString()}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.harvestType.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Total Biomass</Text>
                    <Text style={styles.metricValue}>{item.totalBiomassKg.toLocaleString()} <Text style={styles.metricUnit}>kg</Text></Text>
                </View>
                <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>ABW</Text>
                    <Text style={styles.metricValue}>{item.abw} <Text style={styles.metricUnit}>g</Text></Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Sold to: {item.buyerName}</Text>
            </View>
            {item.pricePerKg && (
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>Price/kg: {item.pricePerKg}</Text>
                </View>
            )}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Harvest Records</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="basket-outline" size={64} color={Colors.border} />
                            <Text style={styles.emptyTitle}>No Harvests Yet</Text>
                            <Text style={styles.emptyText}>This pond has not recorded any harvests.</Text>
                        </View>
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: spacing.md },
    title: { ...typography.h3, color: Colors.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md, paddingBottom: 100 },
    card: { padding: spacing.md, marginBottom: spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    dateText: { ...typography.labelLarge, color: Colors.textPrimary },
    badge: { backgroundColor: Colors.success + '15', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    badgeText: { color: Colors.success, ...typography.labelSmall, fontWeight: '700' },
    metricsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: spacing.xl, marginBottom: spacing.md },
    metricBlock: {},
    metricLabel: { ...typography.labelMedium, color: Colors.textSecondary, marginBottom: 4 },
    metricValue: { ...typography.h2, color: Colors.textPrimary },
    metricUnit: { ...typography.bodyLarge, color: Colors.textSecondary },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    detailText: { ...typography.bodyMedium, color: Colors.textSecondary },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...typography.h4, color: Colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
    emptyText: { ...typography.bodyMedium, color: Colors.textSecondary },
});
