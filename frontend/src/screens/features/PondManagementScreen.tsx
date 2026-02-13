import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, Modal, Portal, TextInput, Button, ActivityIndicator, Avatar, Chip } from 'react-native-paper';
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
import { GradientButton } from '../../components/GradientButton';

const PondManagementScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { farmId, farmName } = route.params || {};

    const [ponds, setPonds] = useState<Pond[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // New Pond
    const [name, setName] = useState('');
    const [area, setArea] = useState('');
    const [depth, setDepth] = useState('');

    useEffect(() => {
        if (farmId) loadPonds();
    }, [farmId]);

    const loadPonds = async () => {
        setLoading(true);
        try {
            const data = await PondService.fetchPonds(farmId);
            setPonds(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePond = async () => {
        if (!name) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Validation', 'Pond name is required');
            return;
        }

        try {
            await PondService.createPond({
                farm_id: farmId,
                name,
                area_m2: area ? parseFloat(area) : 0,
                depth_m: depth ? parseFloat(depth) : 0,
                status: 'active'
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            setName('');
            setArea('');
            setDepth('');
            loadPonds();
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to create pond');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return Colors.success;
            case 'inactive': return Colors.grey;
            case 'harvested': return Colors.warning;
            default: return Colors.textTertiary;
        }
    };

    const renderItem = ({ item }: { item: Pond }) => (
        <AppCard style={styles.card}>
            <Card.Title
                title={item.name}
                left={(props) => <Avatar.Icon {...props} icon="fishbowl-outline" style={{ backgroundColor: Colors.secondaryContainer }} color={Colors.primary} />}
                right={() => (
                    <Chip
                        style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                        textStyle={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '600' }}
                    >
                        {item.status?.toUpperCase()}
                    </Chip>
                )}
            />
            <Card.Content>
                <View style={styles.pondMeta}>
                    <Text style={styles.metaText}>Area: {item.area_m2} m²</Text>
                    <Text style={styles.metaText}>Depth: {item.depth_m} m</Text>
                </View>
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
                            icon="fishbowl-outline"
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

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Pond</Text>
                    <TextInput label="Pond Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="fishbowl-outline" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Area (m²)" value={area} onChangeText={setArea} mode="outlined" keyboardType="numeric" style={styles.input} left={<TextInput.Icon icon="ruler-square" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Depth (m)" value={depth} onChangeText={setDepth} mode="outlined" keyboardType="numeric" style={styles.input} left={<TextInput.Icon icon="arrow-collapse-down" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />

                    <GradientButton title="Create Pond" onPress={handleCreatePond} icon="plus-circle" style={{ marginTop: Layout.spacing.sm }} />
                    <Button mode="text" onPress={() => setModalVisible(false)} style={{ marginTop: Layout.spacing.sm }}>
                        Cancel
                    </Button>
                </Modal>
            </Portal>
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
    metaText: { color: Colors.textSecondary, fontSize: 13 },
    statusChip: { marginRight: Layout.spacing.lg },
    fab: {
        position: 'absolute',
        margin: Layout.spacing.lg,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.primary,
    },
    modalContent: {
        backgroundColor: Colors.modalBackground,
        padding: Layout.modalPadding,
        margin: Layout.modalMargin,
        borderRadius: Layout.modalRadius,
    },
    modalTitle: { marginBottom: Layout.spacing.lg, textAlign: 'center', color: Colors.text, fontWeight: '600' },
    input: { marginBottom: Layout.spacing.md, backgroundColor: Colors.surface },
});

export default PondManagementScreen;
