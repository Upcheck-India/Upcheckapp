import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { theme } from '../../../theme';
import { diseaseApi, DiseaseRecord } from '../../../api/diseases';

const severityColors: Record<string, { bg: string; text: string }> = {
    mild: { bg: theme.roles.light.successBg, text: theme.roles.light.successText },
    moderate: { bg: theme.roles.light.warningBg, text: theme.roles.light.warningText },
    severe: { bg: theme.roles.light.dangerBg, text: theme.roles.light.dangerText },
};

export const DiseaseHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, cropId } = route.params;
    const [records, setRecords] = useState<DiseaseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchRecords = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);
        setError(null);

        try {
            if (cropId) {
                const { data } = await diseaseApi.getByCrop(cropId);
                const sorted = [...data].sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
                setRecords(sorted);
            } else {
                setRecords([]);
            }
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [cropId]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchRecords(true);
    }, [fetchRecords]);

    const handleDelete = useCallback((item: DiseaseRecord) => {
        Alert.alert(
            t('common.delete'),
            t('history.diseaseDeleteMsg', { date: new Date(item.recordedDate).toLocaleDateString() }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await diseaseApi.remove(item.id);
                            setRecords((prev) => prev.filter((r) => r.id !== item.id));
                        } catch {
                            Alert.alert(t('common.error'), t('history.diseaseDeleteError'));
                        }
                    },
                },
            ],
        );
    }, [t]);

    const renderItem = ({ item }: { item: DiseaseRecord }) => {
        const severity = item.severityAtDetection?.toLowerCase() || '';
        const chipColors = severityColors[severity] || { bg: theme.roles.light.surfaceVariant, text: theme.roles.light.textSecondary };
        return (
            <Card style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.dateText}>
                        {new Date(item.recordedDate).toLocaleDateString()}
                    </Text>
                    <View style={styles.headerActions}>
                        {item.severityAtDetection && (
                            <View style={[styles.severityChip, { backgroundColor: chipColors.bg }]}>
                                <Text style={[styles.severityText, { color: chipColors.text }]}>
                                    {item.severityAtDetection}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.roles.light.textDisabled} />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.diseaseId}>{t('history.diseaseIdLabel', { id: item.diseaseId })}</Text>
                {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
                {item.photoUrls && item.photoUrls.length > 0 && (
                    <View style={styles.photoRow}>
                        <MaterialCommunityIcons name="camera" size={14} color={theme.roles.light.textSecondary} />
                        <Text style={styles.photoCount}>{t('history.diseasePhotoCount', { count: item.photoUrls.length })}</Text>
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
                <Text style={styles.title}>{t('history.diseaseTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.roles.light.primary} /></View>
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={handleRetry} />
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} tintColor={theme.roles.light.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="bug-outline" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>{t('history.diseaseEmptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('history.diseaseEmptyText')}</Text>
                        </View>
                    }
                />
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('DiseaseLog', { pondId, cropId })} />
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
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
