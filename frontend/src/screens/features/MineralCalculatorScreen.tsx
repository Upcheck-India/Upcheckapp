import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Text, Button, useTheme, Card, SegmentedButtons, Checkbox, Portal, Modal, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AVAILABLE_CHEMICALS, MineralService, Chemical } from '../../services/mineralService';
import { AppInput } from '../../components/AppInput';
import { AppCard } from '../../components/AppCard';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const MineralCalculatorScreen = () => {
    const theme = useTheme();

    // Step state
    const [step, setStep] = useState(1); // 1: Info, 2: Chemistry, 3: Chemicals

    // Step 1: Info
    const [species, setSpecies] = useState('vannamei');
    const [salinity, setSalinity] = useState('');
    const [volume, setVolume] = useState(''); // Added for dosage calc

    // Step 2: Chemistry
    const [calcium, setCalcium] = useState('');
    const [magnesium, setMagnesium] = useState('');
    const [potassium, setPotassium] = useState('');
    const [sodium, setSodium] = useState('');

    // Step 3: Chemical Selection
    const [selectedChemicals, setSelectedChemicals] = useState<string[]>([]);

    // Results
    const [results, setResults] = useState<any>(null);

    const handleCalculate = () => {
        const pondVolume = parseFloat(volume) || 1000; // Default to 1000m3 if not set to avoid NaN
        const salinityVal = parseFloat(salinity);

        if (!salinityVal) {
            Alert.alert('Validation', 'Please enter salinity');
            return;
        }

        const calculation = MineralService.calculateDosage(
            species as any,
            {
                salinity: salinityVal,
                calcium: parseFloat(calcium) || 0,
                magnesium: parseFloat(magnesium) || 0,
                potassium: parseFloat(potassium) || 0,
                sodium: parseFloat(sodium) || 0,
                phosphorus: 0
            },
            selectedChemicals,
            pondVolume
        );

        setResults(calculation);
    };

    const toggleChemical = (id: string) => {
        if (selectedChemicals.includes(id)) {
            setSelectedChemicals(selectedChemicals.filter(c => c !== id));
        } else {
            setSelectedChemicals([...selectedChemicals, id]);
        }
    };

    const renderStep1 = () => (
        <AppCard>
            <Card.Title title="Step 1: Pond Info" />
            <Card.Content>
                <Text style={styles.label}>Select Species</Text>
                <SegmentedButtons
                    value={species}
                    onValueChange={setSpecies}
                    buttons={[
                        { value: 'vannamei', label: 'Vannamei' },
                        { value: 'monodon', label: 'Monodon' },
                    ]}
                    style={styles.segmentedButton}
                />

                <AppInput
                    label="Salinity (ppt)"
                    value={salinity}
                    onChangeText={setSalinity}
                    keyboardType="numeric"
                />

                <AppInput
                    label="Pond Volume (m³)"
                    value={volume}
                    onChangeText={setVolume}
                    keyboardType="numeric"
                    placeholder="Approx water volume"
                />

                <Button mode="contained" onPress={() => setStep(2)} style={styles.button} buttonColor={Colors.primary}>
                    Next: Water Parameters
                </Button>
            </Card.Content>
        </AppCard>
    );

    const renderStep2 = () => (
        <AppCard>
            <Card.Title title="Step 2: Water Chemistry" subtitle="Enter current test results" />
            <Card.Content>
                <View style={styles.row}>
                    <AppInput label="Calcium (mg/L)" value={calcium} onChangeText={setCalcium} keyboardType="numeric" style={styles.half} />
                    <AppInput label="Magnesium (mg/L)" value={magnesium} onChangeText={setMagnesium} keyboardType="numeric" style={styles.half} />
                </View>
                <View style={styles.row}>
                    <AppInput label="Potassium (mg/L)" value={potassium} onChangeText={setPotassium} keyboardType="numeric" style={styles.half} />
                    <AppInput label="Sodium (mg/L)" value={sodium} onChangeText={setSodium} keyboardType="numeric" style={styles.half} />
                </View>

                <View style={styles.buttonRow}>
                    <Button mode="outlined" onPress={() => setStep(1)} style={styles.navBtn}>Back</Button>
                    <Button mode="contained" onPress={() => setStep(3)} style={styles.navBtn} buttonColor={Colors.primary}>Next: Chemicals</Button>
                </View>
            </Card.Content>
        </AppCard>
    );

    const renderStep3 = () => (
        <AppCard>
            <Card.Title title="Step 3: Chemical Selection" subtitle="Choose available chemicals" />
            <Card.Content>
                <View style={styles.chemList}>
                    {AVAILABLE_CHEMICALS.map((chem) => (
                        <TouchableOpacity key={chem.id} style={styles.chemItem} onPress={() => toggleChemical(chem.id)}>
                            <Checkbox status={selectedChemicals.includes(chem.id) ? 'checked' : 'unchecked'} color={Colors.primary} />
                            <View>
                                <Text variant="bodyMedium">{chem.name}</Text>
                                <Text variant="bodySmall" style={{ color: Colors.grey }}>{chem.formula}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.buttonRow}>
                    <Button mode="outlined" onPress={() => setStep(2)} style={styles.navBtn}>Back</Button>
                    <Button mode="contained" onPress={() => { handleCalculate(); }} style={styles.navBtn} buttonColor={Colors.success}>Calculate</Button>
                </View>
            </Card.Content>
        </AppCard>
    );

    const renderResults = () => {
        if (!results) return null;
        return (
            <View>
                <AppCard style={styles.resultCard}>
                    <Card.Title title="Target vs Current" left={(props) => <List.Icon {...props} icon="water-check-outline" />} />
                    <Card.Content>
                        <View style={styles.resultRow}>
                            <Text>Calcium:</Text>
                            <Text>{calcium || 0} / {results.targets.calcium.toFixed(1)} (Deficit: {results.deficits.calcium.toFixed(1)})</Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text>Magnesium:</Text>
                            <Text>{magnesium || 0} / {results.targets.magnesium.toFixed(1)} (Deficit: {results.deficits.magnesium.toFixed(1)})</Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text>Potassium:</Text>
                            <Text>{potassium || 0} / {results.targets.potassium.toFixed(1)} (Deficit: {results.deficits.potassium.toFixed(1)})</Text>
                        </View>
                    </Card.Content>
                </AppCard>

                <AppCard style={styles.recommendationCard}>
                    <Card.Title title="Recommendations" left={(props) => <List.Icon {...props} icon="water-plus-outline" />} />
                    <Card.Content>
                        {results.recommendations.length > 0 ? (
                            results.recommendations.map((rec: any, index: number) => (
                                <View key={index} style={styles.recItem}>
                                    <Text style={{ fontWeight: 'bold' }}>{rec.chemical.name}</Text>
                                    <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>{rec.amountKg} kg</Text>
                                </View>
                            ))
                        ) : (
                            <Text>No chemicals needed based on selection.</Text>
                        )}
                        <Button mode="contained" onPress={() => setResults(null)} style={{ marginTop: 16 }} buttonColor={Colors.primary}>Reset</Button>
                    </Card.Content>
                </AppCard>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {!results && (
                    <View style={styles.StepIndicator}>
                        <Text style={[styles.stepLabel, step >= 1 && styles.activeStep]}>1. Info</Text>
                        <Text style={[styles.stepLabel, step >= 2 && styles.activeStep]}>2. Chemistry</Text>
                        <Text style={[styles.stepLabel, step >= 3 && styles.activeStep]}>3. Chemicals</Text>
                    </View>
                )}

                {results ? renderResults() : (
                    <>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Layout.padding,
    },
    label: {
        marginBottom: 8,
    },
    segmentedButton: {
        marginBottom: Layout.margin,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    half: {
        width: '48%'
    },
    button: {
        marginTop: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    navBtn: {
        width: '48%',
    },
    chemList: {
        marginTop: 8,
    },
    chemItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    StepIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    stepLabel: {
        color: Colors.grey,
        fontWeight: 'bold',
    },
    activeStep: {
        color: Colors.primary,
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    resultCard: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.warning,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    recommendationCard: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.success,
    },
    recItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    }
});

export default MineralCalculatorScreen;
