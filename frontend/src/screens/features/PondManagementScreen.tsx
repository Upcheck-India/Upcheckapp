import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, Modal, Portal, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PondService } from '../../services/pondService';
import { Pond } from '../../types/database';

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
            setModalVisible(false);
            setName('');
            setArea('');
            setDepth('');
            loadPonds();
        } catch (error) {
            Alert.alert('Error', 'Failed to create pond');
        }
    };

    const renderItem = ({ item }: { item: Pond }) => (
        <Card style={styles.card}>
            <Card.Title title={item.name} subtitle={`Status: ${item.status}`} />
            <Card.Content>
                <Text>Area: {item.area_m2} m²</Text>
                <Text>Depth: {item.depth_m} m</Text>
            </Card.Content>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall">{farmName} - Ponds</Text>
            </View>

            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <FlatList
                    data={ponds}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No ponds in this farm.</Text>}
                />
            )}

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={() => setModalVisible(true)}
                label="Add Pond"
            />

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Pond</Text>
                    <TextInput label="Pond Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
                    <TextInput label="Area (m²)" value={area} onChangeText={setArea} mode="outlined" keyboardType="numeric" style={styles.input} />
                    <TextInput label="Depth (m)" value={depth} onChangeText={setDepth} mode="outlined" keyboardType="numeric" style={styles.input} />

                    <Button mode="contained" onPress={handleCreatePond} style={styles.button}>
                        Create Pond
                    </Button>
                    <Button mode="text" onPress={() => setModalVisible(false)} style={styles.button}>
                        Cancel
                    </Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 16, backgroundColor: '#fff', elevation: 2 },
    listContent: { padding: 16 },
    card: { marginBottom: 12 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    emptyText: { textAlign: 'center', marginTop: 24, color: '#666' },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
    modalTitle: { marginBottom: 16, textAlign: 'center' },
    input: { marginBottom: 12 },
    button: { marginTop: 8 }
});

export default PondManagementScreen;
