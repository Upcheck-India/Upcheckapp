import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, Menu, Text, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { PondService } from '../../../services/pondService';
import { CropsService, CropData as Crop } from '../../../services/cropsService';
import { DataEntryService } from '../../../services/dataEntryService';

const PlanktonEntryScreen = ({ navigation }: any) => {
    const [ponds, setPonds] = useState<any[]>([]);
    const [selectedPond, setSelectedPond] = useState<any>(null);
    const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);

    const [form, setForm] = useState({
        measurementDate: new Date().toISOString().split('T')[0],
        measurementTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        greenAlgae: '',
        blueGreenAlgae: '',
        diatom: '',
        protozoa: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadPonds(); }, []);

    const loadPonds = async () => {
        try {
            const data = await PondService.fetchAllUserPonds();
            setPonds(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectPond = async (pond: any) => {
        setSelectedPond(pond);
        setMenuVisible(false);
        const crop = await CropsService.getActiveCrop(pond.id);
        setActiveCrop(crop || null);
    };

    const handleSubmit = async () => {
        if (!activeCrop) return;
        setSubmitting(true);
        try {
            await DataEntryService.addPlanktonRecord({
                cropId: activeCrop.id,
                measurementDate: form.measurementDate,
                measurementTime: form.measurementTime,
                greenAlgaeGaCellMl: Number(form.greenAlgae) || undefined,
                blueGreenAlgaeBgaCellMl: Number(form.blueGreenAlgae) || undefined,
                diatomCellMl: Number(form.diatom) || undefined,
                protozoaCellMl: Number(form.protozoa) || undefined,
            });
            Alert.alert('Success', 'Plankton data saved!');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to save data');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Plankton Data</Text>

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
                        <TextInput
                            label="Green Algae (cells/ml)"
                            value={form.greenAlgae}
                            onChangeText={t => setForm({ ...form, greenAlgae: t })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Blue-Green Algae (cells/ml)"
                            value={form.blueGreenAlgae}
                            onChangeText={t => setForm({ ...form, blueGreenAlgae: t })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Diatom (cells/ml)"
                            value={form.diatom}
                            onChangeText={t => setForm({ ...form, diatom: t })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Protozoa (cells/ml)"
                            value={form.protozoa}
                            onChangeText={t => setForm({ ...form, protozoa: t })}
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
    disabledCard: { opacity: 0.6 },
});

export default PlanktonEntryScreen;
