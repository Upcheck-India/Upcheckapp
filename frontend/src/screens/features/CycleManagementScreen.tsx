import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CropsService } from '../../services/cropsService';
import { Crop } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import FinancialSummaryCard from './finance/FinancialSummaryCard';

const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(new Date(date));
};

const CycleManagementScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { pondId, pondName } = route.params;

    const [crops, setCrops] = useState<Crop[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCrops();
    }, [pondId]);

    const loadCrops = async () => {
        setLoading(true);
        try {
            const data = await CropsService.fetchCropsByPond(pondId);
            setCrops(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return Colors.success;
            case 'completed': return Colors.primary;
            case 'cancelled': return Colors.error;
            default: return Colors.textTertiary;
        }
    };

    const renderItem = ({ item }: { item: Crop }) => (
        <AppCard style={styles.card}>
            <View style={styles.headerRow}>
                <View>
                    <Text variant="titleMedium" style={styles.title}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.subtitle}>
                        {formatDate(item.stockingDate || item.createdAt)}
                        {item.actualHarvestDate ? ` - ${formatDate(item.actualHarvestDate)}` : ' (Ongoing)'}
                    </Text>
                </View>
                <Chip
                    textStyle={{ color: getStatusColor(item.status), fontWeight: '700', fontSize: 10 }}
                    style={{ backgroundColor: getStatusColor(item.status) + '20', height: 24 }}
                >
                    {item.status.toUpperCase()}
                </Chip>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text variant="labelSmall" style={styles.label}>SPECIES</Text>
                    <Text variant="bodyMedium">{item.speciesType?.toUpperCase() || '-'}</Text>
                </View>
                {item.harvestWeightKg && (
                    <View style={styles.stat}>
                        <Text variant="labelSmall" style={styles.label}>HARVEST</Text>
                        <Text variant="bodyMedium">{item.harvestWeightKg.toLocaleString()} kg</Text>
                    </View>
                )}
                <View style={styles.stat}>
                    <Text variant="labelSmall" style={styles.label}>STOCKING</Text>
                    <Text variant="bodyMedium">{item.stockingCount?.toLocaleString() || '-'}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <Chip
                    icon="scale"
                    mode="outlined"
                    onPress={() => navigation.navigate('HarvestHistory' as any, {
                        cropId: item.id,
                        pondName,
                        cycleName: item.name
                    })}
                >
                    Harvests
                </Chip>

                {item.status === 'active' && (
                    <Chip
                        icon="plus"
                        mode="flat"
                        onPress={() => navigation.navigate('HarvestEntry' as any, {
                            cropId: item.id,
                            pondId,
                            pondName,
                            cycleName: item.name
                        })}
                        style={{ marginLeft: 8, backgroundColor: Colors.primary }}
                        textStyle={{ color: 'white' }}
                    >
                        Record Harvest
                    </Chip>
                )}

                <Chip
                    icon="cash"
                    mode="outlined"
                    onPress={() => navigation.navigate('ExpenseEntry' as any, {
                        cropId: item.id,
                        pondId,
                        pondName,
                        cycleName: item.name
                    })}
                    style={{ marginLeft: 8, borderColor: Colors.error }}
                    textStyle={{ color: Colors.error }}
                >
                    Expense
                </Chip>
            </View>

            <View style={{ marginTop: 16 }}>
                <FinancialSummaryCard cropId={item.id} />
            </View>
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Production Cycles" subtitle={`History for ${pondName}`} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={crops}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="clock-outline"
                            title="No History"
                            subtitle="No production cycles found for this pond."
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    listContent: { padding: Layout.spacing.lg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginBottom: Layout.spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Layout.spacing.sm },
    title: { fontWeight: 'bold', color: Colors.text },
    subtitle: { color: Colors.textSecondary },
    statsRow: { flexDirection: 'row', marginTop: Layout.spacing.xs, justifyContent: 'space-between' },
    stat: { alignItems: 'flex-start' },
    label: { color: Colors.textTertiary, fontSize: 10, letterSpacing: 0.5 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
});

export default CycleManagementScreen;
