import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { HarvestsService } from '../../../services/harvestsService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Harvest } from '../../../types/database';

const HarvestEntryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { cropId, pondId, pondName, cycleName } = route.params;

    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
    const [harvestType, setHarvestType] = useState<'partial' | 'full'>('partial');
    const [weightKg, setWeightKg] = useState('');
    const [averageSize, setAverageSize] = useState(''); // Size count per kg
    const [salePriceTotal, setSalePriceTotal] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (!weightKg || !harvestDate) {
            Alert.alert('Validation Error', 'Weight and Date are required');
            return;
        }

        if (harvestType === 'full') {
            Alert.alert(
                'Confirm Full Harvest',
                'Recording a full harvest will CLOSE this cycle provided all data is final. Are you sure?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: performSubmit }
                ]
            );
        } else {
            performSubmit();
        }
    };

    const performSubmit = async () => {
        setSubmitting(true);
        try {
            await HarvestsService.create({
                cropId,
                harvestDate,
                harvestType,
                weightKg: parseFloat(weightKg),
                averageSize: averageSize ? parseFloat(averageSize) : undefined,
                salePriceTotal: salePriceTotal ? parseFloat(salePriceTotal) : undefined,
                buyerName: buyerName || undefined,
                notes,
                status: 'sold', // Default to sold
            });
            Alert.alert('Success', 'Harvest recorded successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save harvest record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Record Harvest" subtitle={`${pondName} - ${cycleName}`} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Harvest Type */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Harvest Type</Text>
                    <SegmentedButtons
                        value={harvestType}
                        onValueChange={value => setHarvestType(value as any)}
                        buttons={[
                            { value: 'partial', label: 'Partial', icon: 'scissors-cutting' },
                            { value: 'full', label: 'Full / Final', icon: 'check-all' },
                        ]}
                        style={styles.input}
                    />
                    {harvestType === 'full' && (
                        <HelperText type="info" visible>
                            Full harvest will mark the cycle as completed.
                        </HelperText>
                    )}

                    {/* Weight */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Total Weight</Text>
                    <TextInput
                        mode="outlined"
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="numeric"
                        placeholder="0.0"
                        right={<TextInput.Affix text="kg" />}
                        style={styles.input}
                    />

                    {/* Size / ABW */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Average Size (Count/kg)</Text>
                    <TextInput
                        mode="outlined"
                        value={averageSize}
                        onChangeText={setAverageSize}
                        keyboardType="numeric"
                        placeholder="e.g. 50"
                        style={styles.input}
                    />

                    {/* Sales Info */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Sales (Optional)</Text>
                    <TextInput
                        mode="outlined"
                        label="Total Sale Price (Rp)"
                        value={salePriceTotal}
                        onChangeText={setSalePriceTotal}
                        keyboardType="numeric"
                        style={styles.input}
                    />
                    <TextInput
                        mode="outlined"
                        label="Buyer Name"
                        value={buyerName}
                        onChangeText={setBuyerName}
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
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
                        style={styles.submitButton}
                        buttonColor={harvestType === 'full' ? Colors.success : Colors.primary}
                    >
                        {harvestType === 'full' ? 'Complete Harvest & Close Cycle' : 'Save Harvest Record'}
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
    submitButton: { marginTop: 24, paddingVertical: 6 },
});

export default HarvestEntryScreen;
