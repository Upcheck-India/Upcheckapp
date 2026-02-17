import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, ActivityIndicator, Avatar, Chip, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { PondService } from '../../services/pondService';
import { Pond } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AddPondModal } from '../../components/AddPondModal';

const PondManagementScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { farmId, farmName } = route.params || {};

    const [ponds, setPonds] = useState<Pond[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (farmId) loadPonds();
    }, [farmId]);

    const loadPonds = async () => {
        setLoading(true);
        try {
            const response = await PondService.fetchPonds(farmId);
            setPonds(response.ponds);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePond = async (formData: any) => {
        setCreating(true);
        try {
            await PondService.createPond({
                ...formData,
                farmId,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            loadPonds();
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create pond');
        } finally {
            setCreating(false);
        }
    };

    const handleArchivePond = (id: string, name: string) => {
        Alert.alert(
            'Archive Pond',
            `Are you sure you want to archive ${name}? This will mark it as archived without deleting its history.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await PondService.archivePond(id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            loadPonds();
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to archive');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return Colors.success;
            case 'fallow': return Colors.grey;
            case 'harvesting': return Colors.warning;
            case 'archived': return Colors.error;
            default: return Colors.textTertiary;
        }
    };

    const renderItem = ({ item }: { item: Pond }) => (
        <AppCard
            style={styles.card}
            onPress={() => navigation.navigate('PondDetail', { pondId: item.id, pondName: item.displayName || item.name })}
            onLongPress={() => handleArchivePond(item.id, item.displayName || item.name)}
        >
            <Card.Title
                title={item.displayName || item.name}
                subtitle={item.pondCode}
                left={(props) => <Avatar.Icon {...props} icon="waves" style={{ backgroundColor: Colors.secondaryContainer }} color={Colors.primary} />}
                right={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Chip
                            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                            textStyle={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '600' }}
                        >
                            {item.status?.toUpperCase()}
                        </Chip>
                    </View>
                )}
            />
            <Card.Content>
                <View style={styles.pondMeta}>
                    <Text style={styles.metaText}>{item.geometryType.toUpperCase()} • {item.constructionType.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.pondMeta}>
                    <Text style={styles.metaText}>Area: {item.calculatedAreaM2} m²</Text>
                    <Text style={styles.metaText}>Depth: {item.depthM} m</Text>
                </View>
                {item.activeCycle && (
                    <View style={styles.activeCycleRow}>
                        <Avatar.Icon icon="sprout" size={24} style={{ backgroundColor: 'transparent' }} color={Colors.success} />
                        <Text style={{ fontWeight: '600', color: Colors.text, flex: 1 }}>{item.activeCycle.name}</Text>
                        <Chip style={{ height: 24, backgroundColor: Colors.success + '20' }} textStyle={{ color: Colors.success, fontSize: 10, lineHeight: 10 }}>DOC {item.activeCycle.doc}</Chip>
                    </View>
                )}
            </Card.Content>
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title={farmName || 'Ponds'}
                subtitle={`${ponds.length} pond${ponds.length !== 1 ? 's' : ''}`}
                variant="flat"
            />

            {loading ? <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} /> : (
                <FlatList
                    data={ponds}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="waves"
                            title="No ponds yet"
                            subtitle="Add your first pond to start tracking water quality and crops."
                            actionLabel="Add Pond"
                            onAction={() => setModalVisible(true)}
                        />
                    }
                />
            )}

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={() => setModalVisible(true)}
                label="Add Pond"
                color={Colors.textLight}
            />

            <AddPondModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onSubmit={handleCreatePond}
                loading={creating}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    listContent: { padding: Layout.spacing.lg },
    card: { marginBottom: Layout.spacing.md },
    pondMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Layout.spacing.xs,
    },
    activeCycleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Layout.spacing.sm,
        paddingTop: Layout.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: 4
    },
    metaText: { color: Colors.textSecondary, fontSize: 13 },
    statusChip: { marginRight: Layout.spacing.lg },
    fab: {
        position: 'absolute',
        margin: Layout.spacing.lg,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.primary,
    },
});

export default PondManagementScreen;
