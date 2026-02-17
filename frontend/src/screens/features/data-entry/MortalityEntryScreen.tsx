import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, Menu, Text, TextInput, HelperText, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { PondService } from '../../../services/pondService';
import { CropsService } from '../../../services/cropsService';
import { Crop } from '../../../types/database';
import { DataEntryService } from '../../../services/dataEntryService';

const MortalityEntryScreen = ({ navigation }: any) => {
    const [ponds, setPonds] = useState<any[]>([]);
    const [selectedPond, setSelectedPond] = useState<any>(null);
    const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);

    const [form, setForm] = useState({
        mortalityDate: new Date().toISOString().split('T')[0],
        basedOn: 'count', // 'quantity' or 'count'
        totalQuantity: '',
        totalWeightKg: '',
        multiplier: '1.0',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadPonds();
    }, []);

    const loadPonds = async () => {
        const data = await PondService.fetchAllUserPonds();
        setPonds(data);
    };

    const handleSelectPond = async (pond: any) => {
        setSelectedPond(pond);
        setMenuVisible(false);
        try {
            const crop = await CropsService.fetchActiveCrop(pond.id);
            setActiveCrop(crop || null);
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        if (!activeCrop) return;
        setSubmitting(true);
        try {
            await DataEntryService.addMortalityRecord({
                cropId: activeCrop.id,
                mortalityDate: form.mortalityDate,
                basedOn: form.basedOn,
                totalQuantity: Number(form.totalQuantity),
                totalWeightKg: Number(form.totalWeightKg) || undefined,
                multiplier: Number(form.multiplier),
            });
            Alert.alert('Success', 'Mortality record saved!');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to save');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Mortality Record</Text>

                <Card style={styles.card}>
                    <Card.Content>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                                    {selectedPond ? selectedPond.name : 'Select Pond'}
                                </Button>
                            }
                        >
                            {ponds.map(p => (
                                <Menu.Item key={p.id} onPress={() => handleSelectPond(p)} title={p.name} />
                            ))}
                        </Menu>
                        {selectedPond && !activeCrop && <HelperText type="error">No active crop.</HelperText>}
                    </Card.Content>
                </Card>

                <Card style={[styles.card, !activeCrop && styles.disabledCard]}>
                    <Card.Content>
                        <Text style={styles.label}>Estimation Method</Text>
                        <SegmentedButtons
                            value={form.basedOn}
                            onValueChange={v => setForm({ ...form, basedOn: v })}
                            buttons={[
                                { value: 'count', label: 'By Count' },
                                { value: 'quantity', label: 'By Weight/Qty' },
                            ]}
                            style={styles.segment}
                        />

                        <TextInput
                            label="Total Quantity (pcs)"
                            value={form.totalQuantity}
                            onChangeText={t => setForm({ ...form, totalQuantity: t })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />

                        <TextInput
                            label="Total Weight (kg) - Optional"
                            value={form.totalWeightKg}
                            onChangeText={t => setForm({ ...form, totalWeightKg: t })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />

                        <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={!activeCrop} style={styles.button}>
                            Save
                        </Button>
                    </Card.Content>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Layout.padding },
    title: { textAlign: 'center', marginBottom: 20, color: Colors.primaryDark, fontWeight: 'bold' },
    card: { marginBottom: 16, backgroundColor: Colors.surface },
    input: { marginBottom: 12 },
    button: { marginTop: 8 },
    label: { marginBottom: 8 },
    segment: { marginBottom: 16 },
    disabledCard: { opacity: 0.6 },
});

export default MortalityEntryScreen;
