import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { logResourcesApi, ChemicalRecord } from '../../../api/logResources';

export const ChemicalHistoryScreen = ({ route, navigation }: any) => {
    const { cropId } = route.params;
    const [records, setRecords] = useState<ChemicalRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await logResourcesApi.getAllChemical();
            const filtered = cropId ? data.filter((r) => r.cropId === cropId) : data;
            filtered.sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
            setRecords(filtered);
        } catch (error) {
            console.log('Failed to fetch chemical records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: ChemicalRecord }) => (
        <Card style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                    {new Date(item.measurementDate).toLocaleDateString()}
                </Text>
                <Text style={styles.timeText}>{item.measurementTime}</Text>
            </View>
            <View style={styles.grid}>
                {item.ammoniaNh3Ppm != null && <MetricPill label="NH₃" value={`${item.ammoniaNh3Ppm} ppm`} />}
                {item.nitriteNo2Ppm != null && <MetricPill label="NO₂" value={`${item.nitriteNo2Ppm} ppm`} />}
                {item.nitrateNo3Ppm != null && <MetricPill label="NO₃" value={`${item.nitrateNo3Ppm} ppm`} />}
                {item.alkalinityPpm != null && <MetricPill label="Alk" value={`${item.alkalinityPpm} ppm`} />}
                {item.hardnessPpm != null && <MetricPill label="Hard" value={`${item.hardnessPpm} ppm`} />}
                {item.calciumCaPpm != null && <MetricPill label="Ca" value={`${item.calciumCaPpm} ppm`} />}
                {item.magnesiumMgPpm != null && <MetricPill label="Mg" value={`${item.magnesiumMgPpm} ppm`} />}
                {item.phosphatePo4Ppm != null && <MetricPill label="PO₄" value={`${item.phosphatePo4Ppm} ppm`} />}
            </View>
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Chemical History</Text>
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
                            <MaterialCommunityIcons name="flask-empty-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Chemical Logs</Text>
                            <Text style={styles.emptyText}>No chemical data recorded yet.</Text>
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[3] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    timeText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
