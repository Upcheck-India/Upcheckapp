import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, RadioButton } from 'react-native-paper';
import { Colors } from '../../../constants/Colors';
import { InventoryService, InventoryItem } from '../../../services/inventoryService';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    onSuccess: () => void;
    farmId: string;
}

const InventoryActionModal = ({ visible, onDismiss, onSuccess, farmId }: Props) => {
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [category, setCategory] = useState('feed');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('kg');
    const [unitPrice, setUnitPrice] = useState('');
    const [reorderLevel, setReorderLevel] = useState('');

    const handleSubmit = async () => {
        if (!name || !quantity) return;

        setSubmitting(true);
        try {
            await InventoryService.create({
                farmId, // Assuming we have a default farm or passed in
                name,
                category: category as any,
                quantity: parseFloat(quantity),
                unit,
                unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
                reorderLevel: reorderLevel ? parseFloat(reorderLevel) : undefined,
            });
            onSuccess();
            onDismiss();
            resetForm();
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setCategory('feed');
        setQuantity('');
        setUnit('kg');
        setUnitPrice('');
        setReorderLevel('');
    };

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ backgroundColor: Colors.surface }}>
                <Dialog.Title>Add Inventory Item</Dialog.Title>
                <Dialog.Content>
                    <ScrollView>
                        <TextInput
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            mode="outlined"
                        />

                        <Text style={{ marginTop: 8, marginBottom: 4 }}>Category</Text>
                        <RadioButton.Group onValueChange={value => setCategory(value)} value={category}>
                            <View style={styles.radioRow}><RadioButton value="feed" /><Text>Feed</Text></View>
                            <View style={styles.radioRow}><RadioButton value="chemical" /><Text>Chemical</Text></View>
                            <View style={styles.radioRow}><RadioButton value="medicine" /><Text>Medicine</Text></View>
                            <View style={styles.radioRow}><RadioButton value="equipment" /><Text>Equipment</Text></View>
                        </RadioButton.Group>

                        <TextInput
                            label="Initial Quantity"
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Unit (e.g., kg, L, pcs)"
                            value={unit}
                            onChangeText={setUnit}
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Reorder Level"
                            value={reorderLevel}
                            onChangeText={setReorderLevel}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                    </ScrollView>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button onPress={handleSubmit} loading={submitting} mode="contained">Add</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    input: { marginBottom: 12, backgroundColor: Colors.surface },
    radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 }
});

export default InventoryActionModal;
