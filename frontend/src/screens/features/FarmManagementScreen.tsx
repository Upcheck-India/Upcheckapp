import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, Modal, Portal, TextInput, Button, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FarmService } from '../../services/farmService';
import { Farm } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { GradientButton } from '../../components/GradientButton';

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
            const data = await FarmService.fetchFarms();
            setFarms(data);
        } catch (error) {
            // silent fail for now if auth issues
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFarm = async () => {
        if (!name) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Validation', 'Farm name is required');
            return;
        }

        try {
            await FarmService.createFarm({
                name,
                address,
                area_hectares: area ? parseFloat(area) : undefined,
                privacy_setting: 'private'
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            setName('');
            setAddress('');
            setArea('');
            loadFarms();
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to create farm');
        }
    };

    const renderItem = ({ item }: { item: Farm }) => (
        <AppCard style={styles.card} onPress={() => navigation.navigate('PondManagement', { farmId: item.id, farmName: item.name })}>
            <Card.Title
                title={item.name}
                subtitle={item.address || 'No address'}
                left={(props) => <Avatar.Icon {...props} icon="home-group" style={{ backgroundColor: Colors.secondaryContainer }} color={Colors.primary} />}
            />
            <Card.Content>
                <View style={styles.farmMeta}>
                    <Text style={styles.metaText}>Code: {item.farm_code}</Text>
                    <Text style={styles.metaText}>Area: {item.area_hectares || '—'} ha</Text>
                </View>
            </Card.Content>
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="My Farms" subtitle={`${farms.length} farm${farms.length !== 1 ? 's' : ''}`} variant="flat" />

            {loading ? <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} /> : (
                <FlatList
                    data={farms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="tractor-variant"
                            title="No farms yet"
                            subtitle="Create your first farm to start managing ponds and crops."
                            actionLabel="Add Farm"
                            onAction={() => setModalVisible(true)}
                        />
                    }
                />
            )}

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={() => setModalVisible(true)}
                label="Add Farm"
                color={Colors.textLight}
            />

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Farm</Text>
                    <TextInput label="Farm Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="home-group" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Address" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} left={<TextInput.Icon icon="map-marker" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Area (Hectares)" value={area} onChangeText={setArea} mode="outlined" keyboardType="numeric" style={styles.input} left={<TextInput.Icon icon="ruler-square" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />

                    <GradientButton title="Create Farm" onPress={handleCreateFarm} icon="plus-circle" style={{ marginTop: Layout.spacing.sm }} />
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
    farmMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Layout.spacing.xs,
    },
    metaText: { color: Colors.textSecondary, fontSize: 13 },
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

export default FarmManagementScreen;
