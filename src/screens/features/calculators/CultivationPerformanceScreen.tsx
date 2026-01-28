import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { CalculatorsService } from '../../../services/calculatorsService';

const CultivationPerformanceScreen = () => {
    const [inputs, setInputs] = useState({
        dailyFeed: '',
        fr: '',
        abw: '',
        cumulativeFeed: '',
        initialStocking: '',
    });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const response = await CalculatorsService.calculateCultivationPerformance({
                dailyFeed: Number(inputs.dailyFeed),
                fr: Number(inputs.fr),
                abw: Number(inputs.abw),
                cumulativeFeed: Number(inputs.cumulativeFeed),
                initialStocking: Number(inputs.initialStocking),
            });
            setResult(response.result || response);
        } catch (error) {
            console.error(error);
            alert('Calculation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Cultivation Performance</Text>

                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Daily Feed (kg)"
                            value={inputs.dailyFeed}
                            onChangeText={(text) => setInputs({ ...inputs, dailyFeed: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Feeding Rate (%)"
                            value={inputs.fr}
                            onChangeText={(text) => setInputs({ ...inputs, fr: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Average Body Weight (g)"
                            value={inputs.abw}
                            onChangeText={(text) => setInputs({ ...inputs, abw: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Cumulative Feed (kg)"
                            value={inputs.cumulativeFeed}
                            onChangeText={(text) => setInputs({ ...inputs, cumulativeFeed: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Initial Stocking (pcs)"
                            value={inputs.initialStocking}
                            onChangeText={(text) => setInputs({ ...inputs, initialStocking: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />

                        <Button
                            mode="contained"
                            onPress={handleCalculate}
                            loading={loading}
                            style={styles.button}
                        >
                            Calculate
                        </Button>
                    </Card.Content>
                </Card>

                {result && (
                    <Card style={styles.resultCard}>
                        <Card.Title title="Results" />
                        <Card.Content>
                            <View style={styles.row}>
                                <Text>Biomass:</Text>
                                <Text style={styles.value}>{result.biomass} kg</Text>
                            </View>
                            <View style={styles.row}>
                                <Text>Population:</Text>
                                <Text style={styles.value}>{result.population} pcs</Text>
                            </View>
                            <View style={styles.row}>
                                <Text>FCR:</Text>
                                <Text style={styles.value}>{result.fcr}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text>Survival Rate:</Text>
                                <Text style={styles.value}>{result.sr}%</Text>
                            </View>
                        </Card.Content>
                    </Card>
                )}
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
    resultCard: { marginTop: 16, borderTopWidth: 4, borderTopColor: Colors.primary },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    value: { fontWeight: 'bold', fontSize: 16 },
});

export default CultivationPerformanceScreen;
