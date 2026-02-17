import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PondService } from '../../../services/pondService';
import { SamplingService } from '../../../services/samplingService';
import { Pond } from '../../../types/database';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';

const SamplingEntryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { pondId: initialPondId, pondName: initialPondName } = route.params || {};

    const [ponds, setPonds] = useState<Pond[]>([]);
    const [loadingPonds, setLoadingPonds] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedPondId, setSelectedPondId] = useState(initialPondId || '');
    const [mbwG, setMbwG] = useState('');
    const [totalSamples, setTotalSamples] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!initialPondId) {
            loadPonds();
        }
    }, []);

    const loadPonds = async () => {
        setLoadingPonds(true);
        try {
            const data = await PondService.fetchPonds('', { status: 'active' });
            setPonds(data.ponds);
            if (data.ponds.length > 0 && !selectedPondId) {
                setSelectedPondId(data.ponds[0].id);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load active ponds');
        } finally {
            setLoadingPonds(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPondId || !mbwG) {
            Alert.alert('Validation Error', 'Pond and MBW are required');
            return;
        }

        setSubmitting(true);
        try {
            await SamplingService.create({
                pondId: selectedPondId,
                samplingDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                mbwG: parseFloat(mbwG),
                totalSamples: totalSamples ? parseInt(totalSamples) : undefined,
                notes,
            });
            Alert.alert('Success', 'Sampling record saved successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save sampling record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Sampling Entry" subtitle="Record growth data" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Pond Selection */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Pond</Text>
                    {initialPondId ? (
                        <TextInput
                            mode="outlined"
                            value={initialPondName || 'Selected Pond'}
                            editable={false}
                            style={styles.input}
                            right={<TextInput.Icon icon="lock" />}
                        />
                    ) : (
                        loadingPonds ? <ActivityIndicator style={{ alignSelf: 'flex-start', margin: 10 }} /> :
                            <View style={styles.pickerContainer}>
                                {ponds.map(p => (
                                    <Button
                                        key={p.id}
                                        mode={selectedPondId === p.id ? 'contained' : 'outlined'}
                                        onPress={() => setSelectedPondId(p.id)}
                                        style={styles.pondButton}
                                        compact
                                    >
                                        {p.displayName || p.name}
                                    </Button>
                                ))}
                                {ponds.length === 0 && <Text>No active ponds found.</Text>}
                            </View>
                    )}

                    {/* MBW */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Average Body Weight (ABW/MBW)</Text>
                    <TextInput
                        mode="outlined"
                        value={mbwG}
                        onChangeText={setMbwG}
                        keyboardType="numeric"
                        placeholder="0.0"
                        right={<TextInput.Affix text="grams" />}
                        style={styles.input}
                    />

                    {/* Sample Count */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Number of Samples</Text>
                    <TextInput
                        mode="outlined"
                        value={totalSamples}
                        onChangeText={setTotalSamples}
                        keyboardType="numeric"
                        placeholder="Optional"
                        style={styles.input}
                    />

                    {/* Notes */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
                    <TextInput
                        mode="outlined"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        placeholder="Optional notes..."
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
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
    sectionTitle: { marginTop: 16, marginBottom: 8, fontWeight: '600', color: Colors.text },
    input: { marginBottom: 8, backgroundColor: Colors.surface },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pondButton: { marginBottom: 8 },
    submitButton: { marginTop: 24, paddingVertical: 6 },
});

export default SamplingEntryScreen;
