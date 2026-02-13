import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { CalculatorsService } from '../../../services/calculatorsService';

const FreeAmmoniaScreen = () => {
    const [inputs, setInputs] = useState({
        tan: '',
        ph: '',
        temperature: '',
    });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const response = await CalculatorsService.calculateFreeAmmonia({
                tan: Number(inputs.tan),
                ph: Number(inputs.ph),
                temperature: Number(inputs.temperature),
            });
            setResult(response.result || response);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Calculation failed');
        } finally {
            setLoading(false);
        }
    };

    const getToxicityColor = (level: string) => {
        if (level === 'critical' || level === 'high') return Colors.error;
        if (level === 'warning' || level === 'medium') return Colors.warning;
        return Colors.success;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Free Ammonia Calculator</Text>

                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Total Ammonia Nitrogen (TAN) ppm"
                            value={inputs.tan}
                            onChangeText={(text) => setInputs({ ...inputs, tan: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="pH"
                            value={inputs.ph}
                            onChangeText={(text) => setInputs({ ...inputs, ph: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Temperature (°C)"
                            value={inputs.temperature}
                            onChangeText={(text) => setInputs({ ...inputs, temperature: text })}
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
                                <Text>Unionized Ammonia (NH3):</Text>
                                <Text style={styles.value}>{result.unionizedAmmonia} ppm</Text>
                            </View>
                            <View style={styles.row}>
                                <Text>Toxicity Level:</Text>
                                <Text style={[styles.value, { color: getToxicityColor(result.toxicityLevel) }]}>
                                    {result.toxicityLevel.toUpperCase()}
                                </Text>
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

export default FreeAmmoniaScreen;
