import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { theme } from '../../theme';
import { feedProductsApi, FeedProduct } from '../../api/feedProducts';
import { useFocusEffect } from '@react-navigation/native';

// ── Helper: normalise paged OR flat array responses ──────────────────────────

function extractArray<T>(response: any): T[] {
    const payload = response?.data;
    if (Array.isArray(payload)) return payload as T[];
    if (payload && Array.isArray(payload.data)) return payload.data as T[];
    return [];
}

// ── Screen ───────────────────────────────────────────────────────────────────

export const FeedProductsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [products, setProducts] = useState<FeedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    const hasFetched = useRef(false);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchProducts = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && hasFetched.current) return;

        setError(null);
        setIsOffline(false);

        try {
            const response = await feedProductsApi.getAll();
            setProducts(extractArray<FeedProduct>(response));
            hasFetched.current = true;
        } catch (err: any) {
            const statusCode = err?.response?.status;
            if (statusCode === 0 || err?.code === 'NETWORK_ERROR' || !err?.response) {
                setIsOffline(true);
            }
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [fetchProducts]),
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchProducts(true);
    }, [fetchProducts]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        hasFetched.current = false;
        fetchProducts(true);
    }, [fetchProducts]);

    // ── Item renderer ─────────────────────────────────────────────────────────

    const renderItem = useCallback(({ item }: { item: FeedProduct }) => {
        return (
            <Card style={styles.itemCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.roles.light.infoBg }]}>
                        <MaterialCommunityIcons
                            name="corn"
                            size={20}
                            color={theme.roles.light.infoText}
                        />
                    </View>
                    <View style={styles.cardTitleBlock}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.name ?? item.code}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.brand}
                            {item.type ? `  ·  ${item.type}` : ''}
                        </Text>
                    </View>
                    {item.proteinPercent != null && (
                        <View style={styles.proteinBadge}>
                            <Text style={styles.proteinValue}>{item.proteinPercent}%</Text>
                            <Text style={styles.proteinLabel}>{t('inventory.proteinLabel')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.metaChip}>
                        <MaterialCommunityIcons
                            name="barcode"
                            size={14}
                            color={theme.roles.light.textTertiary}
                        />
                        <Text style={styles.metaText}>{item.code}</Text>
                    </View>
                    {item.sizeRangeMm ? (
                        <View style={styles.metaChip}>
                            <MaterialCommunityIcons
                                name="arrow-expand-horizontal"
                                size={14}
                                color={theme.roles.light.textTertiary}
                            />
                            <Text style={styles.metaText}>{item.sizeRangeMm} mm</Text>
                        </View>
                    ) : null}
                </View>
            </Card>
        );
    }, [t]);

    // ── Loading skeleton ──────────────────────────────────────────────────────

    const renderSkeleton = () => (
        <View style={styles.listContent}>
            <SkeletonList count={5} />
        </View>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ScreenWrapper scroll={false} padded={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={theme.roles.light.textPrimary}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('inventory.feedProductsTitle')}</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Body */}
            {isLoading ? (
                renderSkeleton()
            ) : isOffline ? (
                <NetworkError onRetry={handleRetry} />
            ) : error && products.length === 0 ? (
                <ErrorState
                    title={t('inventory.feedErrorTitle')}
                    error={error}
                    onRetry={handleRetry}
                />
            ) : (
                <FlatList
                    data={products}
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
                        <EmptyState
                            icon="corn"
                            title={t('inventory.feedEmptyTitle')}
                            subtitle={t('inventory.feedEmptySubtitle')}
                        />
                    }
                />
            )}
        </ScreenWrapper>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backButton: {
        marginRight: theme.spacing[3],
    },
    headerTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        flex: 1,
    },
    headerSpacer: {
        width: 24,
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    itemCard: {
        marginBottom: theme.spacing[3],
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleBlock: {
        flex: 1,
        marginLeft: theme.spacing[3],
    },
    cardTitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    cardSubtitle: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginTop: 2,
    },
    proteinBadge: {
        alignItems: 'center',
        backgroundColor: theme.roles.light.successBg,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    proteinValue: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.successText,
    },
    proteinLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.successText,
    },
    cardFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        backgroundColor: theme.roles.light.surfaceVariant,
        gap: theme.spacing[2],
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
    },
    metaText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textTertiary,
    },
});
