import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Button, Card, Menu, Text, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { PondService } from '../../../services/pondService';
import { CropsService } from '../../../services/cropsService';
import { Crop } from '../../../types/database';
import { DataEntryService } from '../../../services/dataEntryService';

const ChemicalEntryScreen = ({ navigation }: any) => {
    const [ponds, setPonds] = useState<any[]>([]);
    const [selectedPond, setSelectedPond] = useState<any>(null);
    const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
    const [loadingPonds, setLoadingPonds] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    // Form fields
    const [form, setForm] = useState({
        measurementDate: new Date().toISOString().split('T')[0],
        measurementTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        ammoniaNh3Ppm: '',
        nitriteNo2Ppm: '',
        alkalinityPpm: '',
        ph: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadPonds();
    }, []);

    const loadPonds = async () => {
        try {
            const data = await PondService.fetchAllUserPonds();
            setPonds(data);
        } catch (error) {
            console.error('Failed to load ponds', error);
        } finally {
            setLoadingPonds(false);
        }
    };

    const handleSelectPond = async (pond: any) => {
        setSelectedPond(pond);
        setMenuVisible(false);
        // Load active crop
        try {
            const crop = await CropsService.fetchActiveCrop(pond.id);
            setActiveCrop(crop || null);
        } catch (error) {
            console.error('Failed to load active crop', error);
            setActiveCrop(null);
        }
    };

    const handleSubmit = async () => {
        if (!activeCrop) {
            Alert.alert('Validation', 'No active crop selected');
            return;
        }

        setSubmitting(true);
        try {
            await DataEntryService.addChemicalRecord({
                cropId: activeCrop.id,
                measurementDate: form.measurementDate,
                measurementTime: form.measurementTime,
                ammoniaNh3Ppm: Number(form.ammoniaNh3Ppm) || undefined,
                nitriteNo2Ppm: Number(form.nitriteNo2Ppm) || undefined,
                alkalinityPpm: Number(form.alkalinityPpm) || undefined,
                // Add other fields as needed
            });
            Alert.alert('Success', 'Chemical data saved!');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save data');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Chemical Data Entry</Text>

                {/* Pond Selection */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.label}>Select Pond</Text>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    onPress={() => setMenuVisible(true)}
                                    style={styles.dropdown}
                                >
                                    {selectedPond ? `${selectedPond.name} (${selectedPond.farm?.name})` : 'Select a Pond'}
                                </Button>
                            }
                        >
                            {ponds.map((pond) => (
                                <Menu.Item
                                    key={pond.id}
                                    onPress={() => handleSelectPond(pond)}
                                    title={`${pond.name} - ${pond.farm?.name}`}
                                />
                            ))}
                        </Menu>

                        {selectedPond && !activeCrop && (
                            <HelperText type="error" visible={true}>
                                No active crop found for this pond.
                            </HelperText>
                        )}
                    </Card.Content>
                </Card>

                {/* Data Entry Form */}
                <Card style={[styles.card, !activeCrop && styles.disabledCard]}>
                    <Card.Content>
                        <TextInput
                            label="Ammonia (NH3) ppm"
                            value={form.ammoniaNh3Ppm}
                            onChangeText={t => setForm({ ...form, ammoniaNh3Ppm: t })}
                            keyboardType="numeric"
                            disabled={!activeCrop}
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Nitrite (NO2) ppm"
                            value={form.nitriteNo2Ppm}
                            onChangeText={t => setForm({ ...form, nitriteNo2Ppm: t })}
                            keyboardType="numeric"
                            disabled={!activeCrop}
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Alkalinity ppm"
                            value={form.alkalinityPpm}
                            onChangeText={t => setForm({ ...form, alkalinityPpm: t })}
                            keyboardType="numeric"
                            disabled={!activeCrop}
                            style={styles.input}
                            mode="outlined"
                        />

                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={submitting}
                            disabled={!activeCrop || submitting}
                            style={styles.button}
                        >
                            Save Record
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
    input: { marginBottom: 12, backgroundColor: Colors.surface },
    button: { marginTop: 8 },
    label: { marginBottom: 8, color: Colors.textSecondary },
    dropdown: { borderColor: Colors.primary },
    disabledCard: { opacity: 0.6 },
});

export default ChemicalEntryScreen;
