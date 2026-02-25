import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { diseaseApi, DiseaseRecord } from '../../../api/diseases';

const severityColors: Record<string, { bg: string; text: string }> = {
    mild: { bg: theme.roles.light.successBg, text: theme.roles.light.successText },
    moderate: { bg: theme.roles.light.warningBg, text: theme.roles.light.warningText },
    severe: { bg: theme.roles.light.dangerBg, text: theme.roles.light.dangerText },
};

export const DiseaseHistoryScreen = ({ route, navigation }: any) => {
    const { cropId } = route.params;
    const [records, setRecords] = useState<DiseaseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await diseaseApi.getAll();
            const filtered = cropId ? data.filter((r) => r.cropId === cropId) : data;
            filtered.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
            setRecords(filtered);
        } catch (error) {
            console.log('Failed to fetch disease records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: DiseaseRecord }) => {
        const severity = item.severityAtDetection?.toLowerCase() || '';
        const chipColors = severityColors[severity] || { bg: theme.roles.light.surfaceVariant, text: theme.roles.light.textSecondary };
        return (
            <Card style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>
                        {new Date(item.recordedDate).toLocaleDateString()}
                    </Text>
                    {item.severityAtDetection && (
                        <View style={[styles.severityChip, { backgroundColor: chipColors.bg }]}>
                            <Text style={[styles.severityText, { color: chipColors.text }]}>
                                {item.severityAtDetection}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.diseaseId}>Disease ID: {item.diseaseId}</Text>
                {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
                {item.photoUrls && item.photoUrls.length > 0 && (
                    <View style={styles.photoRow}>
                        <MaterialCommunityIcons name="camera" size={14} color={theme.roles.light.textSecondary} />
                        <Text style={styles.photoCount}>{item.photoUrls.length} photo(s)</Text>
                    </View>
                )}
            </Card>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Disease History</Text>
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
                            <MaterialCommunityIcons name="bug-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Disease Logs</Text>
                            <Text style={styles.emptyText}>No disease events recorded yet.</Text>
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
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    severityChip: { paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    severityText: { ...theme.typeScale.labelSmall, fontWeight: '700', textTransform: 'capitalize' as const },
    diseaseId: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing[3] },
    photoCount: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
