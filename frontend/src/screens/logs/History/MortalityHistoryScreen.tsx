import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Alert } from 'react-native';
import { useCachedFetch } from '../../../query/hooks';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { StaleNotice } from '../../../components/ui/CacheNotice';
import { ErrorState, NetworkError } from '../../../components/ui/ErrorState';
import { FAB } from '../../../components/ui/FAB';
import { PhotoStrip } from '../../../components/ui/PhotoStrip';
import { theme } from '../../../theme';
import { mortalityApi, MortalityRecord } from '../../../api/mortalities';
import { formatDate } from '../../../utils/formatDate';

export const MortalityHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, cropId } = route.params;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    // Paints the last list instantly and revalidates on every focus (this
    // replaces the old per-mount 30s cacheRef).
    const { data, isInitialLoading: isLoading, isRefreshing, error, refresh: handleRefresh, setData } = useCachedFetch(
        ['mortalityHistory', cropId ?? null],
        async (): Promise<MortalityRecord[]> => {
            if (!cropId) return [];
            const { data } = await mortalityApi.getByCrop(cropId);
            return [...data].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
        },
    );
    const records = data ?? [];
    const handleRetry = handleRefresh;
    const err: any = error;
    const isOffline = !!err && (err?.response?.status === 0 || err?.code === 'NETWORK_ERROR' || !err?.response);

    useEffect(() => {
        if (data !== undefined) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        }
    }, [data, fadeAnim]);

    const handleDelete = useCallback((item: MortalityRecord) => {
        Alert.alert(
            t('common.delete') + ' ' + t('common.date'),
            t('history.mortalityDeleteMsg', { date: formatDate(item.recordDate, { day: 'numeric', month: 'short', year: 'numeric' }) }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await mortalityApi.remove(item.id);
                            setData((prev) => (prev ?? []).filter((r) => r.id !== item.id));
                        } catch (err) {
                            Alert.alert(t('common.error'), t('history.mortalityDeleteError'));
                        }
                    },
                },
            ],
        );
    }, []);

    const totalMortality = records.reduce((sum, r) => sum + r.quantity, 0);

    const renderSkeleton = () => (
        <View style={styles.listContent}>
            <SkeletonList count={3} />
        </View>
    );

    const renderItem = useCallback(({ item }: { item: MortalityRecord }) => {
        const animStyle = { opacity: fadeAnim };

        return (
            <Animated.View style={animStyle}>
                <Card style={styles.card}>
                    <View style={styles.headerRow}>
                        <Text style={styles.dateText}>
                            {formatDate(item.recordDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                        <View style={styles.headerRow}>
                            <View style={styles.countChip}>
                                <MaterialCommunityIcons name="skull-outline" size={14} color={theme.roles.light.dangerText} />
                                <Text style={styles.countText}>{item.quantity}</Text>
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('MortalityLog', { pondId, cropId, editRecord: item })}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.edit', 'Edit')}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.roles.light.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.roles.light.dangerText} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    {item.estimatedWeightKg != null && (
                        <Text style={styles.detailText}>{t('history.mortalityEstWeight', { weight: item.estimatedWeightKg })}</Text>
                    )}
                    {item.note && <Text style={styles.notesText}>{item.note}</Text>}
                    {!!item.photoSignedUrls?.length && (
                        <View style={styles.photoRow}>
                            <PhotoStrip full={item.photoSignedUrls} thumbs={item.photoThumbUrls} />
                        </View>
                    )}
                </Card>
            </Animated.View>
        );
    }, [fadeAnim, handleDelete, navigation, pondId, cropId]);

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('history.mortalityTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <StaleNotice visible={!!error && records.length > 0} />
            {isLoading && records.length === 0 ? (
                renderSkeleton()
            ) : isOffline ? (
                <NetworkError onRetry={handleRetry} />
            ) : error && records.length === 0 ? (
                <ErrorState title={t('history.couldNotLoad')} error={error} onRetry={handleRetry} />
            ) : (
                <>
                    {records.length > 0 && (
                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {t('history.mortalityTotalLabel')}<Text style={styles.summaryValue}>{totalMortality.toLocaleString()}</Text>
                            </Text>
                        </View>
                    )}

                    <FlatList
                        data={records}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                colors={[theme.roles.light.primary]}
                                tintColor={theme.roles.light.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="skull-crossbones-outline" size={64} color={theme.roles.light.borderDefault} />
                                <Text style={styles.emptyTitle}>{t('history.mortalityEmptyTitle')}</Text>
                                <Text style={styles.emptyText}>{t('history.mortalityEmptyText')}</Text>
                            </View>
                        }
                    />
                </>
            )}

            <FAB icon="plus" onPress={() => navigation.navigate('MortalityLog', { pondId, cropId })} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[4], backgroundColor: theme.roles.light.surface, borderBottomWidth: 1, borderBottomColor: theme.roles.light.borderDefault },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    summaryBar: { backgroundColor: theme.roles.light.dangerBg, paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[4] },
    summaryText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    summaryValue: { fontWeight: '700', color: theme.roles.light.dangerText },
    listContent: { padding: theme.spacing[4], paddingBottom: 100 },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
    deleteBtn: { marginLeft: theme.spacing[3] },
    dateText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textSecondary },
    countChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: theme.spacing[3], paddingVertical: 4, borderRadius: theme.radius.full },
    countText: { ...theme.typeScale.labelSmall, color: theme.roles.light.dangerText, fontWeight: '700' },
    detailText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    notesText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    photoRow: { marginTop: theme.spacing[3] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
});
