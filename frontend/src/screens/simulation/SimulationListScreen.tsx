import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { Colors, typography, spacing, radius } from '../../theme';
import { simulationsApi, SimulationResult } from '../../api/simulations';

export const SimulationListScreen = ({ navigation }: any) => {
    const [simulations, setSimulations] = useState<SimulationResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSimulations = async () => {
        setIsLoading(true);
        try {
            const { data } = await simulationsApi.getAll();
            setSimulations(data);
        } catch (error) {
            console.log('Failed to fetch simulations', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchSimulations();
        });
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item }: { item: SimulationResult }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SimulationResults', { resultData: item })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Run {new Date(item.createdAt).toLocaleDateString()}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textDisabled} />
            </View>
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="target" size={16} color={Colors.textSecondary} />
                    <Text style={styles.statText}>{item.targetBiomassKg.toLocaleString()} kg Target</Text>
                </View>
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.textSecondary} />
                    <Text style={styles.statText}>{item.cultureDurationDays} DOC</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Simulations</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={simulations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={64} color={Colors.border} />
                            <Text style={styles.emptyTitle}>No Simulations yet</Text>
                            <Text style={styles.emptyDesc}>Create your first forecast to plan your next cycle effectively.</Text>
                        </View>
                    }
                />
            )}

            <FAB
                icon="plus"
                onPress={() => navigation.navigate('SimulationCreate')}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    backBtn: {
        padding: spacing.md,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: Colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptyDesc: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});
