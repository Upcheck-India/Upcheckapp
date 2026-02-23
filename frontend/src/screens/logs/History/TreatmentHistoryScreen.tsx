import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { Colors, typography, spacing, radius } from '../../../theme';
import { treatmentsApi, TreatmentRecord } from '../../../api/treatments';

export const TreatmentHistoryScreen = ({ route, navigation }: any) => {
    const { pondId } = route.params;
    const [records, setRecords] = useState<TreatmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data } = await treatmentsApi.getAll();
            const pondRecords = data.filter((r: TreatmentRecord) => r.pondId === pondId);
            pondRecords.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
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
                    {new Date(item.recordedAt).toLocaleDateString()}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.treatmentType}</Text>
                </View>
            </View>
            <Text style={styles.productText}>{item.productName}</Text>
            <View style={styles.dosageRow}>
                <MaterialCommunityIcons name="pill" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{item.dosage} {item.unit}</Text>

                {item.applicationMethod && (
                    <>
                        <View style={styles.dot} />
                        <Text style={styles.detailText}>{item.applicationMethod}</Text>
                    </>
                )}
            </View>
            {item.reason && <Text style={styles.reasonText}>Reason: {item.reason}</Text>}
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Treatment History</Text>
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
                            <MaterialCommunityIcons name="medical-bag" size={64} color={Colors.border} />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: spacing.md },
    title: { ...typography.h3, color: Colors.textPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md, paddingBottom: 100 },
    card: { padding: spacing.md, marginBottom: spacing.sm },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    dateText: { ...typography.labelLarge, color: Colors.textSecondary },
    badge: { backgroundColor: Colors.info + '15', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    badgeText: { color: Colors.info, ...typography.labelSmall, fontWeight: '700' },
    productText: { ...typography.h4, color: Colors.textPrimary, marginBottom: spacing.xs },
    dosageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    detailText: { ...typography.bodyMedium, color: Colors.textSecondary },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.textDisabled },
    reasonText: { ...typography.bodyMedium, color: Colors.textPrimary, fontStyle: 'italic' },
    notesText: { ...typography.bodySmall, color: Colors.textSecondary, marginTop: spacing.xs },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...typography.h4, color: Colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
    emptyText: { ...typography.bodyMedium, color: Colors.textSecondary },
});
