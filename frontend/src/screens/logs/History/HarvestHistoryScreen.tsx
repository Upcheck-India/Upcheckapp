import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { harvestsApi, HarvestRecord } from '../../../api/harvests';

export const HarvestHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cycleId, cropId } = route.params;
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
            const pondRecords = cropId ? data.filter((r: HarvestRecord) => r.cropId === cropId) : data;
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
                    <Text style={styles.metricValue}>{item.weightKg.toLocaleString()} <Text style={styles.metricUnit}>kg</Text></Text>
                </View>
                <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Avg Size</Text>
                    <Text style={styles.metricValue}>{item.averageSize} <Text style={styles.metricUnit}>g</Text></Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.roles.light.textSecondary} />
                <Text style={styles.detailText}>Sold to: {item.buyerName}</Text>
            </View>
            {item.salePriceTotal && (
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color={theme.roles.light.textSecondary} />
                    <Text style={styles.detailText}>Total Sale: {item.salePriceTotal}</Text>
                </View>
            )}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Harvest Records</Text>
                <View style={{ width: 40 }} />
            </View>

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
                            <MaterialCommunityIcons name="basket-outline" size={64} color={theme.roles.light.borderDefault} />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[4] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    badge: { backgroundColor: theme.roles.light.successText + '15', paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    badgeText: { color: theme.roles.light.successText, ...theme.typeScale.labelSmall, fontWeight: '700' },
    metricsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: theme.spacing[8], marginBottom: theme.spacing[4] },
    metricBlock: {},
    metricLabel: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, marginBottom: 4 },
    metricValue: { ...theme.typeScale.h2, color: theme.roles.light.textPrimary },
    metricUnit: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textSecondary },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginTop: theme.spacing[2] },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
