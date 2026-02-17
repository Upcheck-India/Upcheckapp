import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, DataTable, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { HarvestsService } from '../../../services/harvestsService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Harvest } from '../../../types/database';

const HarvestHistoryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { cropId, pondName, cycleName } = route.params;

    const [harvests, setHarvests] = useState<Harvest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHarvests();
    }, []);

    // Reload when coming back from entry
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadHarvests();
        });
        return unsubscribe;
    }, [navigation]);

    const loadHarvests = async () => {
        try {
            const data = await HarvestsService.fetchByCrop(cropId);
            setHarvests(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load harvest history');
        } finally {
            setLoading(false);
        }
    };

    const totalWeight = harvests.reduce((sum, h) => sum + h.weightKg, 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + (h.salePriceTotal || 0), 0);

    const renderItem = ({ item }: { item: Harvest }) => (
        <DataTable.Row>
            <DataTable.Cell>{new Date(item.harvestDate).toLocaleDateString()}</DataTable.Cell>
            <DataTable.Cell numeric>{item.weightKg} kg</DataTable.Cell>
            <DataTable.Cell numeric>{item.averageSize || '-'}</DataTable.Cell>
            <DataTable.Cell numeric>
                {item.harvestType === 'full' ? '★ Full' : 'Partial'}
            </DataTable.Cell>
        </DataTable.Row>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Harvest History" subtitle={`${pondName} - ${cycleName}`} />

            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Total Harvested</Text>
                    <Text variant="headlineSmall" style={{ color: Colors.primary, fontWeight: 'bold' }}>
                        {totalWeight.toLocaleString()} kg
                    </Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text variant="labelMedium" style={{ color: Colors.textSecondary }}>Total Revenue</Text>
                    <Text variant="headlineSmall" style={{ color: Colors.success, fontWeight: 'bold' }}>
                        Rp {totalRevenue.toLocaleString()}
                    </Text>
                </View>
            </View>

            <DataTable>
                <DataTable.Header>
                    <DataTable.Title>Date</DataTable.Title>
                    <DataTable.Title numeric>Weight</DataTable.Title>
                    <DataTable.Title numeric>Size</DataTable.Title>
                    <DataTable.Title numeric>Type</DataTable.Title>
                </DataTable.Header>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={harvests}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No harvest records yet.</Text>}
                    />
                )}
            </DataTable>

            <FAB
                icon="plus"
                label="Add Harvest"
                style={styles.fab}
                onPress={() => navigation.navigate('HarvestEntry' as any, { cropId, pondId: route.params.pondId, pondName, cycleName })}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    summaryContainer: {
        flexDirection: 'row',
        padding: Layout.padding,
        backgroundColor: Colors.surface,
        marginBottom: 8,
        elevation: 1,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.primary,
    },
});

export default HarvestHistoryScreen;
