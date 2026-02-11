import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, Modal, Portal, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FarmService } from '../../services/farmService';
import { Farm } from '../../types/database';
import { AppCard } from '../../components/AppCard';

const FarmManagementScreen = () => {
    const navigation = useNavigation<any>();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // New Farm State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [area, setArea] = useState('');

    useEffect(() => {
        loadFarms();
    }, []);

    const loadFarms = async () => {
        setLoading(true);
        try {
            // Check auth first ideally
            const data = await FarmService.fetchFarms();
            setFarms(data);
        } catch (error) {
            // console.error(error); // silent fail for now if auth issues
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFarm = async () => {
        if (!name) {
            Alert.alert('Validation', 'Farm name is required');
            return;
        }

        try {
            await FarmService.createFarm({
                name,
                address,
                area_hectares: area ? parseFloat(area) : undefined,
                privacy_setting: 'private' // default
            });
            setModalVisible(false);
            setName('');
            setAddress('');
            setArea('');
            loadFarms(); // Refresh list
        } catch (error) {
            Alert.alert('Error', 'Failed to create farm');
        }
    };

    const renderItem = ({ item }: { item: Farm }) => (
        <AppCard style={styles.card} onPress={() => navigation.navigate('PondManagement', { farmId: item.id, farmName: item.name })}>
            <Card.Title title={item.name} subtitle={item.address || 'No address'} />
            <Card.Content>
                <Text>Code: {item.farm_code}</Text>
                <Text>Area: {item.area_hectares} hectares</Text>
            </Card.Content>
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall">My Farms</Text>
            </View>

            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <FlatList
                    data={farms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No farms found. Create one to get started.</Text>}
                />
            )}

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={() => setModalVisible(true)}
                label="Add Farm"
            />

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Farm</Text>
                    <TextInput label="Farm Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
                    <TextInput label="Address" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} />
                    <TextInput label="Area (Hectares)" value={area} onChangeText={setArea} mode="outlined" keyboardType="numeric" style={styles.input} />

                    <Button mode="contained" onPress={handleCreateFarm} style={styles.button}>
                        Create Farm
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

export default FarmManagementScreen;
