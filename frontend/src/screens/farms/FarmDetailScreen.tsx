import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { theme } from '../../theme';
import { pondsApi, Pond } from '../../api/ponds';
import { useMembershipStore } from '../../store/membershipStore';

export const FarmDetailScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { farmId, farmName } = route.params;
    const loadMemberships = useMembershipStore((s) => s.load);
    const isWorker = useMembershipStore((s) => s.isWorker(farmId));
    const [ponds, setPonds] = useState<Pond[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Cache ref
    const cacheRef = useRef<{ data: Pond[]; timestamp: number } | null>(null);
    const CACHE_TTL = 30000;

    // Resolve my role on this farm so owner-only controls can be hidden.
    useEffect(() => { loadMemberships(); }, [loadMemberships]);

    const fadeIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    const fetchPonds = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && cacheRef.current) {
            const { data, timestamp } = cacheRef.current;
            if (Date.now() - timestamp < CACHE_TTL) {
                setPonds(data);
                setIsLoading(false);
                fadeIn();
                return;
            }
        }

        setError(null);
        setIsOffline(false);

        try {
            const response = await pondsApi.getAll(farmId);
            const result = response.data;
            const pondsData = Array.isArray(result) ? result : result.data || [];
            setPonds(pondsData);
            cacheRef.current = { data: pondsData, timestamp: Date.now() };
            fadeIn();
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
    }, [farmId, fadeIn]);

    useFocusEffect(
        useCallback(() => {
            fetchPonds();
        }, [fetchPonds])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchPonds(true);
    }, [fetchPonds]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchPonds(true);
    }, [fetchPonds]);

    const getStatusType = (status: string) => {
        if (status === 'active') return 'active';
        if (status === 'fallow') return 'idle';
        if (status === 'harvesting') return 'warning';
        if (status === 'archived') return 'info';
        return 'info';
    };

    const renderSkeleton = () => (
        <View style={styles.listContent}>
            <SkeletonList count={3} />
        </View>
    );

    const renderPondCard = useCallback(({ item, index }: { item: Pond; index: number }) => {
        const animStyle = {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
        };

        return (
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PondDashboard', { pondId: item.id, pondName: item.name })}
                >
                    <Card style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="water" size={24} color={theme.roles.light.primary} />
                            </View>
                            <View style={styles.titleContainer}>
                                <Text style={styles.pondName} numberOfLines={1}>{item.displayName || item.name}</Text>
                                <Text style={styles.pondType} numberOfLines={1}>{item.constructionType || item.geometryType || 'N/A'}</Text>
                            </View>
                            <StatusBadge status={getStatusType(item.status)} label={t(`ponds.status_${item.status}`, { defaultValue: item.status })} />
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.metric}>
                                <MaterialCommunityIcons name="ruler-square" size={16} color={theme.roles.light.textSecondary} />
                                <Text style={styles.metricText}>
                                    {(() => {
                                        const area = Number(item.overrideAreaM2) || Number(item.calculatedAreaM2) || 0;
                                        return area > 0 ? `${area.toFixed(1)} m²` : 'N/A';
                                    })()}
                                </Text>
                            </View>
                            {item.activeCycleId ? (
                                <View style={styles.metric}>
                                    <MaterialCommunityIcons name="water-check" size={16} color={theme.roles.light.successText} />
                                    <Text style={[styles.metricText, { color: theme.roles.light.successText }]}>{t('farms.activeCycle')}</Text>
                                </View>
                            ) : (
                                <View style={styles.metric}>
                                    <MaterialCommunityIcons name="water-off" size={16} color={theme.roles.light.textDisabled} />
                                    <Text style={styles.metricText}>{t('farms.noActiveCycle')}</Text>
                                </View>
                            )}
                        </View>
                    </Card>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [navigation, fadeAnim, scaleAnim]);

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{farmName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flexShrink: 0 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('TaskList', { farmId, farmName })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={theme.roles.light.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('FarmMembers', { farmId, farmName })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <MaterialCommunityIcons name="account-multiple-plus-outline" size={24} color={theme.roles.light.primary} />
                    </TouchableOpacity>
                    {!isWorker && (
                        <TouchableOpacity onPress={() => navigation.navigate('Transactions', { farmId, farmName })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialCommunityIcons name="cash-multiple" size={24} color={theme.roles.light.primary} />
                        </TouchableOpacity>
                    )}
                    {!isWorker && (
                        <TouchableOpacity onPress={() => navigation.navigate('CreatePond', { farmId })}>
                            <MaterialCommunityIcons name="plus" size={24} color={theme.roles.light.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                renderSkeleton()
            ) : isOffline ? (
                <NetworkError onRetry={handleRetry} />
            ) : error && ponds.length === 0 ? (
                <ErrorState
                    title={t('farms.errorPondsTitle')}
                    error={error}
                    onRetry={handleRetry}
                />
            ) : (
                <FlatList
                    data={ponds}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPondCard}
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
                            icon="water-outline"
                            title={t('farms.noPondsTitle')}
                            subtitle={t('farms.noPondsSubtitle')}
                            actionLabel={t('farms.addPond')}
                            onAction={() => navigation.navigate('CreatePond', { farmId })}
                        />
                    }
                />
            )}
            {!isWorker && <FAB icon="plus" onPress={() => navigation.navigate('CreatePond', { farmId })} />}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: {
        padding: theme.spacing[2],
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        flex: 1,
        marginHorizontal: theme.spacing[2],
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    card: {
        marginBottom: theme.spacing[4],
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.roles.light.infoBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[4],
    },
    titleContainer: {
        flex: 1,
    },
    pondName: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        marginBottom: 2,
    },
    pondType: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        textTransform: 'capitalize',
    },
    cardBody: {
        flexDirection: 'row',
        gap: theme.spacing[6],
        padding: theme.spacing[4],
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
});