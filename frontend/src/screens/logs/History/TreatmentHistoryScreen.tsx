import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme';
import { treatmentsApi, TreatmentRecord } from '../../../api/treatments';

export const TreatmentHistoryScreen = ({ route, navigation }: any) => {
    const { pondId, cropId } = route.params;
    const [records, setRecords] = useState<TreatmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await treatmentsApi.getAll();
            const pondRecords = cropId ? data.filter((r: TreatmentRecord) => r.cropId === cropId) : data;
            pondRecords.sort((a, b) => new Date(b.treatmentDate || b.createdAt || '').getTime() - new Date(a.treatmentDate || a.createdAt || '').getTime());
            setRecords(pondRecords);
        } catch (error) {
            console.log('Failed to fetch treatment records', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: TreatmentRecord }) => (
        <Card style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                    {new Date(item.treatmentDate).toLocaleDateString()}
                </Text>
                {item.basedOn && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.basedOn}</Text>
                    </View>
                )}
            </View>
            <Text style={styles.productText}>{item.description}</Text>
            {item.dosageKg != null && (
                <View style={styles.dosageRow}>
                    <MaterialCommunityIcons name="pill" size={16} color={theme.roles.light.textSecondary} />
                    <Text style={styles.detailText}>{item.dosageKg} kg</Text>
                </View>
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
                <Text style={styles.title}>Treatment History</Text>
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
                            <MaterialCommunityIcons name="medical-bag" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>No Treatments Logged</Text>
                            <Text style={styles.emptyText}>This pond has no recorded treatments.</Text>
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
    badge: { backgroundColor: theme.roles.light.infoBg, paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    badgeText: { color: theme.roles.light.infoBorder, ...theme.typeScale.labelSmall, fontWeight: '700' },
    productText: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
    dosageRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.roles.light.textDisabled },
    reasonText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontStyle: 'italic' },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
