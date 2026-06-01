import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { theme } from '../../theme';
import { simulationsApi, SavedSimulation } from '../../api/simulations';

export const SimulationListScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const [simulations, setSimulations] = useState<SavedSimulation[]>([]);
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

    const handleDelete = (item: SavedSimulation) => {
        Alert.alert(t('simulations.list.deleteTitle'), t('simulations.list.deleteMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await simulationsApi.delete(item.id);
                        setSimulations((prev) => prev.filter((s) => s.id !== item.id));
                    } catch (error) {
                        Alert.alert(t('common.error'), t('simulations.list.errorDelete'));
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: SavedSimulation }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SimulationResults', { resultData: item })}
            onLongPress={() => handleDelete(item)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.scenarioType.replace(/_/g, ' ')} — {new Date(item.createdAt).toLocaleDateString()}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.roles.light.textDisabled} />
            </View>
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="target" size={16} color={theme.roles.light.textSecondary} />
                    <Text style={styles.statText}>{item.resultProjectedBiomass !== null && item.resultProjectedBiomass !== undefined ? t('simulations.list.statBiomass', { value: item.resultProjectedBiomass.toFixed(1) }) : t('simulations.list.statNa')}</Text>
                </View>
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="cash" size={16} color={theme.roles.light.textSecondary} />
                    <Text style={styles.statText}>{t('simulations.list.statProfit', { value: item.resultNetProfit !== null && item.resultNetProfit !== undefined ? item.resultNetProfit.toFixed(0) : t('simulations.list.statNa') })}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('simulations.list.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                </View>
            ) : (
                <FlatList
                    data={simulations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={64} color={theme.roles.light.borderDefault} />
                            <Text style={styles.emptyTitle}>{t('simulations.list.emptyTitle')}</Text>
                            <Text style={styles.emptyDesc}>{t('simulations.list.emptyDesc')}</Text>
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.roles.light.surface,
        padding: theme.spacing[4],
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
    },
    cardTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing[6],
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    emptyDesc: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing[8],
    },
});
