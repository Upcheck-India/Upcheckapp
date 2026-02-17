import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, HelperText, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { FeedRecordsService } from '../../../services/feedRecordsService';
import { InventoryService, InventoryItem } from '../../../services/inventoryService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';

const FeedEntryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { pondId, pondName } = route.params || {};

    const [submitting, setSubmitting] = useState(false);
    const [feedType, setFeedType] = useState('pellet');
    const [quantity, setQuantity] = useState('');
    const [feedingTime, setFeedingTime] = useState('morning');
    const [notes, setNotes] = useState('');

    // Inventory State
    const [useInventory, setUseInventory] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>('');
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    const [loadingInventory, setLoadingInventory] = useState(false);

    useEffect(() => {
        if (!pondId) {
            Alert.alert('Error', 'No pond selected');
            navigation.goBack();
        }
    }, [pondId]);

    useEffect(() => {
        if (useInventory) {
            loadInventory();
        }
    }, [useInventory]);

    useEffect(() => {
        if (selectedInventoryItem) {
            const item = inventoryItems.find(i => i.id === selectedInventoryItem);
            setAvailableStock(item ? Number(item.quantity) : null);
        } else {
            setAvailableStock(null);
        }
    }, [selectedInventoryItem]);

    const loadInventory = async () => {
        setLoadingInventory(true);
        try {
            const data = await InventoryService.fetchAll(undefined, 'feed');
            setInventoryItems(data);
            if (data.length > 0) setSelectedInventoryItem(data[0].id);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingInventory(false);
        }
    };

    const handleSubmit = async () => {
        if (!quantity) {
            Alert.alert('Validation Error', 'Quantity is required');
            return;
        }

        if (useInventory && availableStock !== null && parseFloat(quantity) > availableStock) {
            Alert.alert('Stock Warning', `Insufficient stock. Only ${availableStock} kg available.`);
            return;
        }

        setSubmitting(true);
        try {
            await FeedRecordsService.create({
                pondId,
                feedType: useInventory ? 'Inventory Item' : feedType,
                quantityKg: parseFloat(quantity),
                feedingTime,
                notes,
                inventoryItemId: useInventory ? selectedInventoryItem : undefined
            });
            Alert.alert('Success', 'Feed record saved', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Feed Entry" subtitle={pondName} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Source Selection */}
                    <Text variant="titleMedium" style={styles.label}>Source</Text>
                    <SegmentedButtons
                        value={useInventory ? 'inventory' : 'manual'}
                        onValueChange={val => setUseInventory(val === 'inventory')}
                        buttons={[
                            { value: 'manual', label: 'Manual Entry' },
                            { value: 'inventory', label: 'From Inventory' },
                        ]}
                        style={{ marginBottom: 16 }}
                    />

                    {useInventory ? (
                        <>
                            <Text variant="titleMedium" style={styles.label}>Select Feed Item</Text>
                            {loadingInventory ? <ActivityIndicator style={{ marginBottom: 16 }} /> : (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedInventoryItem}
                                        onValueChange={(itemValue) => setSelectedInventoryItem(itemValue)}
                                    >
                                        {inventoryItems.map((item) => (
                                            <Picker.Item key={item.id} label={`${item.name} (${item.quantity} kg)`} value={item.id} />
                                        ))}
                                    </Picker>
                                </View>
                            )}
                            {availableStock !== null && (
                                <Text style={{ color: availableStock < parseFloat(quantity || '0') ? Colors.error : Colors.primary, marginBottom: 16 }}>
                                    Available: {availableStock} kg
                                </Text>
                            )}
                        </>
                    ) : (
                        <>
                            <TextInput
                                label="Feed Type / Brand"
                                value={feedType}
                                onChangeText={setFeedType}
                                mode="outlined"
                                style={styles.input}
                            />
                        </>
                    )}

                    <TextInput
                        label="Quantity (kg)"
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />

                    <Text variant="titleMedium" style={styles.label}>Feeding Time</Text>
                    <SegmentedButtons
                        value={feedingTime}
                        onValueChange={setFeedingTime}
                        buttons={[
                            { value: 'morning', label: 'Morning' },
                            { value: 'afternoon', label: 'Afternoon' },
                            { value: 'evening', label: 'Evening' },
                            { value: 'night', label: 'Night' },
                        ]}
                        style={{ marginBottom: 16 }}
                        density="small"
                    />

                    <TextInput
                        label="Notes (Optional)"
                        value={notes}
                        onChangeText={setNotes}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        style={styles.submitButton}
                    >
                        Save Record
                    </Button>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Layout.padding },
    input: { marginBottom: 16, backgroundColor: Colors.surface },
    label: { marginBottom: 8, fontWeight: '600', color: Colors.text },
    button: { marginTop: 8, paddingVertical: 6 },
    pickerContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#79747E', // Standard outline color
        marginBottom: 8,
    },
    sectionTitle: { marginTop: 16, marginBottom: 8, fontWeight: '600', color: Colors.text },
    pondButton: { marginBottom: 8 },
    submitButton: { marginTop: 24, paddingVertical: 6 },
});

export default FeedEntryScreen;
