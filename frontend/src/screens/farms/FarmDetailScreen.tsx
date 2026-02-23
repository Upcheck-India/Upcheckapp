import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { theme } from '../../theme';
import { pondsApi, Pond } from '../../api/ponds';

export const FarmDetailScreen = ({ route, navigation }: any) => {
    const { farmId, farmName } = route.params;
    const [ponds, setPonds] = useState<Pond[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchPonds = async () => {
        try {
            const { data } = await pondsApi.getAll(farmId);
            // Depending on API response structure, adjust data extraction
            setPonds(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Failed to fetch ponds:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPonds();
        }, [farmId])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchPonds();
    };

    const getStatusType = (status: string) => {
        if (status === 'active') return 'active';
        if (status === 'idle') return 'idle';
        if (status === 'maintenance') return 'warning';
        return 'info';
    };

    const renderPondCard = ({ item }: { item: Pond }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('PondDashboard', { pondId: item.id, pondName: item.name })}
        >
            <Card style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.pondName}>{item.name}</Text>
                        <Text style={styles.pondType}>{item.type || item.shape}</Text>
                    </View>
                    <StatusBadge status={getStatusType(item.status)} label={item.status} />
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.metric}>
                        <MaterialCommunityIcons name="ruler-square" size={16} color={theme.roles.light.textSecondary} />
                        <Text style={styles.metricText}>{item.areaMm ? `${item.areaMm.toFixed(1)} mm²` : 'N/A'}</Text>
                    </View>
                    {item.activeCycleId ? (
                        <View style={styles.metric}>
                            <MaterialCommunityIcons name="water" size={16} color={theme.roles.light.successText} />
                            <Text style={[styles.metricText, { color: theme.roles.light.successText }]}>Active Cycle</Text>
                        </View>
                    ) : (
                        <View style={styles.metric}>
                            <MaterialCommunityIcons name="water-off" size={16} color={theme.roles.light.textDisabled} />
                            <Text style={styles.metricText}>No Active Cycle</Text>
                        </View>
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{farmName}</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={ponds}
                keyExtractor={(item) => item.id}
                renderItem={renderPondCard}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="water-outline"
                            title="No Ponds Found"
                            subtitle="Add ponds to this farm to begin tracking cycles."
                            actionLabel="Add Pond"
                            onAction={() => navigation.navigate('CreatePond', { farmId })}
                        />
                    ) : null
                }
            />
            <FAB icon="plus" onPress={() => navigation.navigate('CreatePond', { farmId })} />
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
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    card: {
        marginBottom: theme.spacing[4],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
    },
    titleContainer: {
        flex: 1,
        marginRight: theme.spacing[4],
    },
    pondName: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        marginBottom: 4,
    },
    pondType: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        textTransform: 'capitalize',
    },
    cardBody: {
        flexDirection: 'row',
        gap: theme.spacing[6],
        paddingTop: theme.spacing[4],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
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
