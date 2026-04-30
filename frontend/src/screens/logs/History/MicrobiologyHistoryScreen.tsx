import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { logResourcesApi, MicrobiologyRecord } from '../../../api/logResources';

export const MicrobiologyHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cropId } = route.params;
    const [records, setRecords] = useState<MicrobiologyRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchRecords(); }, [cropId]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            if (cropId) {
                const { data } = await logResourcesApi.getMicrobiologyByCrop(cropId);
                const sorted = [...data].sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
                setRecords(sorted);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.log('Failed to fetch microbiology records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getVibrioLevel = (tvc?: number): { label: string; color: string } => {
        if (!tvc) return { label: 'N/A', color: theme.roles.light.textSecondary };
        if (tvc > 1000) return { label: 'Critical', color: theme.roles.light.dangerText };
        if (tvc > 100) return { label: 'Warning', color: theme.roles.light.warningText };
        return { label: 'Safe', color: theme.roles.light.successText };
    };

    const renderItem = ({ item }: { item: MicrobiologyRecord }) => {
        const vibrioLevel = getVibrioLevel(item.totalVibrioCountTvcCfuMl);
        return (
            <Card style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>
                        {new Date(item.measurementDate).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: vibrioLevel.color + '20' }]}>
                        <Text style={[styles.statusText, { color: vibrioLevel.color }]}>{vibrioLevel.label}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {item.totalVibrioCountTvcCfuMl != null && (
                        <MetricPill label="Total Vibrio" value={`${item.totalVibrioCountTvcCfuMl} CFU/mL`} />
                    )}
                    {item.totalBacillusCfuMl != null && (
                        <MetricPill label="Bacillus" value={`${item.totalBacillusCfuMl} CFU/mL`} />
                    )}
                    {item.yellowVibrioCountTvcCfuMl != null && (
                        <MetricPill label="Yellow Vibrio" value={`${item.yellowVibrioCountTvcCfuMl} CFU/mL`} />
                    )}
                    {item.greenVibrioCountTvcCfuMl != null && (
                        <MetricPill label="Green Vibrio" value={`${item.greenVibrioCountTvcCfuMl} CFU/mL`} />
                    )}
                    {item.luminescentBacteriaLbCfuMl != null && (
                        <MetricPill label="Luminescent" value={`${item.luminescentBacteriaLbCfuMl} CFU/mL`} />
                    )}
                </View>
                {item.note && <Text style={styles.notesText}>{item.note}</Text>}
            </Card>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Microbiology History</Text>
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
                            <MaterialCommunityIcons name="bacteria-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Microbiology Logs</Text>
                            <Text style={styles.emptyText}>No microbiology data recorded yet.</Text>
                        </View>
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const MetricPill = ({ label, value }: { label: string; value: string }) => (
    <View style={pillStyles.container}>
        <Text style={pillStyles.label}>{label}</Text>
        <Text style={pillStyles.value}>{value}</Text>
    </View>
);

const pillStyles = StyleSheet.create({
    container: { backgroundColor: theme.roles.light.surfaceVariant, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2], marginRight: theme.spacing[2], marginBottom: theme.spacing[2], minWidth: 100 },
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[3] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    statusChip: { paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    statusText: { ...theme.typeScale.labelSmall, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[3] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
