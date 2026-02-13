import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { CalculatorsService } from '../../../services/calculatorsService';

const ProductDosageScreen = () => {
    const [inputs, setInputs] = useState({
        pondArea: '',
        waterLevel: '',
        dosage: '',
    });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const response = await CalculatorsService.calculateProductDosage({
                pondArea: Number(inputs.pondArea),
                waterLevel: Number(inputs.waterLevel),
                dosage: Number(inputs.dosage),
            });
            setResult(response.result || response);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Calculation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>Product Dosage Calculator</Text>

                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Pond Area (m²)"
                            value={inputs.pondArea}
                            onChangeText={(text) => setInputs({ ...inputs, pondArea: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Water Level (m)"
                            value={inputs.waterLevel}
                            onChangeText={(text) => setInputs({ ...inputs, waterLevel: text })}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                        />
                        <TextInput
                            label="Target Dosage (ppm)"
                            value={inputs.dosage}
                            onChangeText={(text) => setInputs({ ...inputs, dosage: text })}
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
                                <Text>Required Amount:</Text>
                                <Text style={styles.value}>{result.amountKg} kg</Text>
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

export default ProductDosageScreen;
