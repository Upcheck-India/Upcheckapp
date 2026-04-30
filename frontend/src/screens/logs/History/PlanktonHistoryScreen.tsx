import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { logResourcesApi, PlanktonRecord } from '../../../api/logResources';

export const PlanktonHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cropId } = route.params;
    const [records, setRecords] = useState<PlanktonRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchRecords(); }, [cropId]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            if (cropId) {
                const { data } = await logResourcesApi.getPlanktonByCrop(cropId);
                const sorted = [...data].sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
                setRecords(sorted);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.log('Failed to fetch plankton records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTotalCount = (item: PlanktonRecord): number => {
        const fields: (number | undefined)[] = [
            item.greenAlgaeGaCellMl, item.blueGreenAlgaeBgaCellMl, item.dinoflagellataCellMl,
            item.diatomCellMl, item.protozoaCellMl, item.flocCellMl, item.goldenBrownAlgaeCellMl,
            item.euglenophytaCellMl, item.zooCellMl, item.haptoyphytaCellMl,
            item.goldenGreenAlgaeCellMl, item.yellowGreenAlgaeCellMl, item.otherPlanktonCellMl,
        ];
        return fields.reduce<number>((sum, val) => sum + (val || 0), 0);
    };

    const renderItem = ({ item }: { item: PlanktonRecord }) => {
        const total: number = getTotalCount(item);
        return (
            <Card style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>
                        {new Date(item.measurementDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.timeText}>{item.measurementTime}</Text>
                </View>
                <Text style={styles.totalText}>Total: {total.toLocaleString()} cells/mL</Text>
                <View style={styles.grid}>
                    {item.greenAlgaeGaCellMl != null && <MetricPill label="Green Algae" value={item.greenAlgaeGaCellMl} />}
                    {item.blueGreenAlgaeBgaCellMl != null && <MetricPill label="BGA" value={item.blueGreenAlgaeBgaCellMl} />}
                    {item.diatomCellMl != null && <MetricPill label="Diatom" value={item.diatomCellMl} />}
                    {item.dinoflagellataCellMl != null && <MetricPill label="Dino" value={item.dinoflagellataCellMl} />}
                    {item.protozoaCellMl != null && <MetricPill label="Protozoa" value={item.protozoaCellMl} />}
                    {item.zooCellMl != null && <MetricPill label="Zoo" value={item.zooCellMl} />}
                    {item.euglenophytaCellMl != null && <MetricPill label="Eugleno" value={item.euglenophytaCellMl} />}
                </View>
            </Card>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Plankton History</Text>
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
                            <MaterialCommunityIcons name="leaf" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Plankton Logs</Text>
                            <Text style={styles.emptyText}>No plankton data recorded yet.</Text>
                        </View>
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const MetricPill = ({ label, value }: { label: string; value: number }) => (
    <View style={pillStyles.container}>
        <Text style={pillStyles.label}>{label}</Text>
        <Text style={pillStyles.value}>{value.toLocaleString()}</Text>
    </View>
);

const pillStyles = StyleSheet.create({
    container: { backgroundColor: theme.roles.light.surfaceVariant, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2], marginRight: theme.spacing[2], marginBottom: theme.spacing[2] },
    label: { ...theme.typeScale.labelSmall, color: theme.roles.light.textSecondary },
    value: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600' },
});

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    timeText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    totalText: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[3] },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
