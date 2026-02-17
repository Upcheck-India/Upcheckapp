import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, Menu, Text, TextInput, HelperText, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { PondService } from '../../../services/pondService';
import { CropsService } from '../../../services/cropsService';
import { Crop } from '../../../types/database';
import { DiseaseService } from '../../../services/diseaseService';

const DiseaseRecordScreen = ({ navigation }: any) => {
    const [ponds, setPonds] = useState<any[]>([]);
    const [selectedPond, setSelectedPond] = useState<any>(null);
    const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
    const [diseases, setDiseases] = useState<any[]>([]);
    const [selectedDisease, setSelectedDisease] = useState<any>(null);

    const [pondMenuVisible, setPondMenuVisible] = useState(false);
    const [diseaseMenuVisible, setDiseaseMenuVisible] = useState(false);

    const [form, setForm] = useState({
        recordedDate: new Date().toISOString().split('T')[0],
        severity: 'medium',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [pondsData, diseasesData] = await Promise.all([
            PondService.fetchAllUserPonds(),
            DiseaseService.getDiseaseLibrary()
        ]);
        setPonds(pondsData);
        setDiseases(diseasesData);
    };

    const handleSelectPond = async (pond: any) => {
        setSelectedPond(pond);
        setPondMenuVisible(false);
        const crop = await CropsService.fetchActiveCrop(pond.id);
        setActiveCrop(crop || null);
    };

    const handleSubmit = async () => {
        if (!activeCrop || !selectedDisease) return;

        setSubmitting(true);
        try {
            await DiseaseService.recordDisease({
                cropId: activeCrop.id,
                diseaseId: selectedDisease.id,
                recordedDate: form.recordedDate,
                severityAtDetection: form.severity,
                notes: form.notes,
            });
            Alert.alert('Success', 'Disease recorded successfully');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to record disease');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Record Disease</Text>

                {/* Pond Selection */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Menu
                            visible={pondMenuVisible}
                            onDismiss={() => setPondMenuVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setPondMenuVisible(true)}>
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

                {/* Disease Selection */}
                <Card style={[styles.card, !activeCrop && styles.disabledCard]}>
                    <Card.Content>
                        <Text style={styles.label}>Select Disease</Text>
                        <Menu
                            visible={diseaseMenuVisible}
                            onDismiss={() => setDiseaseMenuVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setDiseaseMenuVisible(true)} disabled={!activeCrop}>
                                    {selectedDisease ? selectedDisease.name : 'Choose from Library'}
                                </Button>
                            }
                        >
                            {diseases.map(d => (
                                <Menu.Item key={d.id} onPress={() => { setSelectedDisease(d); setDiseaseMenuVisible(false); }} title={d.name} />
                            ))}
                        </Menu>

                        <Text style={styles.label}>Severity</Text>
                        <SegmentedButtons
                            value={form.severity}
                            onValueChange={v => setForm({ ...form, severity: v })}
                            buttons={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                            style={styles.segment}
                        />

                        <TextInput
                            label="Notes / Observations"
                            value={form.notes}
                            onChangeText={t => setForm({ ...form, notes: t })}
                            multiline
                            numberOfLines={3}
                            style={styles.input}
                            mode="outlined"
                        />

                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={submitting}
                            disabled={!activeCrop || !selectedDisease}
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
    input: { marginBottom: 12 },
    button: { marginTop: 8 },
    label: { marginBottom: 8, marginTop: 12 },
    segment: { marginBottom: 16 },
    disabledCard: { opacity: 0.6 },
});

export default DiseaseRecordScreen;
