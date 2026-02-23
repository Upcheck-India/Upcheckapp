import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, typography, spacing, radius } from '../../theme';
import { farmsApi, Farm } from '../../api/farms';
import { useFocusEffect } from '@react-navigation/native';

export const FarmsListScreen = ({ navigation }: any) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFarms = async () => {
        try {
            const { data } = await farmsApi.getAll();
            setFarms(data);
        } catch (error) {
            console.error('Failed to fetch farms:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFarms();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchFarms();
    };

    const renderFarmCard = ({ item }: { item: Farm }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FarmDetail', { farmId: item.id, farmName: item.name })}
        >
            <Card style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="barn" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.cardTitleContainer}>
                        <Text style={styles.farmName}>{item.name}</Text>
                        {item.location && (
                            <Text style={styles.farmLocation}>
                                <MaterialCommunityIcons name="map-marker-outline" size={14} /> {item.location}
                            </Text>
                        )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textDisabled} />
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.statsText}>
                        <Text style={styles.statsValue}>{item.ponds?.length || 0}</Text> Ponds
                    </Text>
                    {item.totalAreaMm !== undefined && (
                        <Text style={styles.statsText}>
                            <Text style={styles.statsValue}>{item.totalAreaMm} </Text> mm²
                        </Text>
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <FlatList
                data={farms}
                keyExtractor={(item) => item.id}
                renderItem={renderFarmCard}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="barn"
                            title="No Farms Yet"
                            subtitle="Create your first farm to start managing your ponds and cycles."
                            actionLabel="Add Farm"
                            onAction={() => navigation.navigate('CreateFarm')}
                        />
                    ) : null
                }
            />
            <FAB icon="plus" onPress={() => navigation.navigate('CreateFarm')} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    listContent: {
        padding: spacing.md,
        paddingBottom: 100, // Space for FAB
    },
    card: {
        marginBottom: spacing.md,
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primaryLight + '30',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardTitleContainer: {
        flex: 1,
    },
    farmName: {
        ...typography.h3,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    farmLocation: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: Colors.surfaceVariant,
        gap: spacing.lg,
    },
    statsText: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
    },
    statsValue: {
        ...typography.labelLarge,
        color: Colors.textPrimary,
    },
});
