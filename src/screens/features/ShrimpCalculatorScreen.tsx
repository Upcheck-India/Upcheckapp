import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, ProgressBar, useTheme, Card, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShrimpService, ShrimpResults } from '../../services/shrimpService';

const ShrimpCalculatorScreen = () => {
    const theme = useTheme();
    const [step, setStep] = useState(1);

    // Step 1: Basic Info
    const [pondArea, setPondArea] = useState('');
    const [stockingCount, setStockingCount] = useState('');

    // Step 2: Sampling
    const [netDiameter, setNetDiameter] = useState('');
    const [numDrags, setNumDrags] = useState('');
    const [sampleWeight, setSampleWeight] = useState('');
    const [sampleCount, setSampleCount] = useState('');

    // Step 3: Feed
    const [totalFeed, setTotalFeed] = useState('');

    const [results, setResults] = useState<ShrimpResults | null>(null);

    const handleCalculate = () => {
        const inputs = {
            pondArea: parseFloat(pondArea) || 0,
            stockingCount: parseFloat(stockingCount) || 1,
            netDiameter: parseFloat(netDiameter) || 0,
            numberOfDrags: parseFloat(numDrags) || 1,
            sampleWeightKg: parseFloat(sampleWeight) || 0,
            sampleCount: parseFloat(sampleCount) || 0,
            totalFeedKg: parseFloat(totalFeed) || 0,
        };

        if (!inputs.pondArea || !inputs.sampleCount) {
            alert("Please ensure Pond Area and Sample Count are filled.");
            return;
        }

        const res = ShrimpService.calculateStatistics(inputs);
        setResults(res);
    };

    const renderStep1 = () => (
        <Card style={styles.card}>
            <Card.Title title="Step 1: Pond Info" />
            <Card.Content>
                <TextInput label="Pond Area (m²)*" value={pondArea} onChangeText={setPondArea} mode="outlined" keyboardType="numeric" style={styles.input} />
                <TextInput label="Initial Stocking Count*" value={stockingCount} onChangeText={setStockingCount} mode="outlined" keyboardType="numeric" style={styles.input} />

                <Button mode="contained" onPress={() => setStep(2)} style={styles.button}>
                    Next
                </Button>
            </Card.Content>
        </Card>
    );

    const renderStep2 = () => (
        <Card style={styles.card}>
            <Card.Title title="Step 2: Sampling" subtitle="Use a cast net for sampling" />
            <Card.Content>
                <TextInput label="Net Diameter (m)*" value={netDiameter} onChangeText={setNetDiameter} mode="outlined" keyboardType="numeric" style={styles.input} />
                <TextInput label="Number of Drags/Casts*" value={numDrags} onChangeText={setNumDrags} mode="outlined" keyboardType="numeric" style={styles.input} />
                <TextInput label="Total Sample Weight (kg)*" value={sampleWeight} onChangeText={setSampleWeight} mode="outlined" keyboardType="numeric" style={styles.input} />
                <TextInput label="Total Sample Count (heads)*" value={sampleCount} onChangeText={setSampleCount} mode="outlined" keyboardType="numeric" style={styles.input} />

                <View style={styles.row}>
                    <Button mode="outlined" onPress={() => setStep(1)} style={styles.button}>Back</Button>
                    <Button mode="contained" onPress={() => setStep(3)} style={styles.button}>Next</Button>
                </View>
            </Card.Content>
        </Card>
    );

    const renderStep3 = () => (
        <Card style={styles.card}>
            <Card.Title title="Step 3: Feed" />
            <Card.Content>
                <TextInput label="Total Accumulated Feed (kg)*" value={totalFeed} onChangeText={setTotalFeed} mode="outlined" keyboardType="numeric" style={styles.input} />

                <View style={styles.row}>
                    <Button mode="outlined" onPress={() => setStep(2)} style={styles.button}>Back</Button>
                    <Button mode="contained" onPress={handleCalculate} style={styles.button}>Calculate</Button>
                </View>
            </Card.Content>
        </Card>
    );

    const renderResults = () => {
        if (!results) return null;
        return (
            <Card style={styles.resultCard}>
                <Card.Title title="Results" left={(props) => <List.Icon {...props} icon="poll" />} />
                <Card.Content>
                    <List.Item title="Average Body Weight (ABW)" description={`${results.averageBodyWeight} g`} />
                    <Divider />
                    <List.Item title="Survival Rate" description={`${results.survivalRate}%`} descriptionStyle={{ color: results.survivalRate > 80 ? 'green' : 'orange' }} />
                    <Divider />
                    <List.Item title="Estimated Biomass" description={`${results.estimatedBiomass} kg`} />
                    <Divider />
                    <List.Item title="FCR (Feed Conversion Ratio)" description={`${results.fcr}`} descriptionStyle={{ fontWeight: 'bold' }} />

                    <Button mode="contained" onPress={() => setResults(null)} style={styles.button}>Calculate Again</Button>
                </Card.Content>
            </Card>
        );
    };

    // Helper component for divider since List.Item doesn't include it automatically nicely here
    const Divider = () => <View style={{ height: 1, backgroundColor: '#eee' }} />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Shrimp Calculator</Text>

                {!results && (
                    <>
                        <ProgressBar progress={step / 3} style={styles.progress} color={theme.colors.primary} />
                        <Text style={styles.stepText}>Step {step} of 3</Text>
                    </>
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
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
    },
    progress: {
        marginBottom: 8,
        height: 6,
        borderRadius: 3,
    },
    stepText: {
        textAlign: 'right',
        marginBottom: 16,
        color: '#666',
    },
    card: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    button: {
        marginTop: 12,
        flex: 1,
        marginHorizontal: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8
    },
    resultCard: {
        borderTopWidth: 4,
        borderTopColor: '#006d77',
    }
});

export default ShrimpCalculatorScreen;
