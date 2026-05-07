import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { calculatorsApi, ProductDosageResponse } from '../../api/calculators';

export const ProductAmountScreen = ({ navigation }: any) => {
    const [pondArea, setPondArea] = useState('');
    const [waterDepth, setWaterDepth] = useState('');
    const [targetPpm, setTargetPpm] = useState('');
    const [concentration, setConcentration] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ProductDosageResponse | null>(null);
    const [clientResult, setClientResult] = useState<number | null>(null);

    const handleCalculate = async () => {
        const area = parseFloat(pondArea);
        const depth = parseFloat(waterDepth);
        const ppm = parseFloat(targetPpm);
        const conc = concentration ? parseFloat(concentration) : 100;

        if (!area || area <= 0) {
            Alert.alert('Validation Error', 'Pond area must be a positive number');
            return;
        }
        if (!depth || depth <= 0) {
            Alert.alert('Validation Error', 'Water depth must be a positive number');
            return;
        }
        if (!ppm || ppm <= 0) {
            Alert.alert('Validation Error', 'Target ppm must be a positive number');
            return;
        }
        if (concentration && (conc <= 0 || conc > 100)) {
            Alert.alert('Validation Error', 'Concentration must be between 0 and 100');
            return;
        }

        const pondVolume = area * depth;

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateProductDosage({
                pondArea: area,
                waterLevel: depth,
                dosage: ppm,
            });
            setResult(data);

            if (concentration && conc > 0) {
                const clientCalc = (pondVolume * ppm) / (conc * 10000);
                setClientResult(Math.round(clientCalc * 1000) / 1000);
            } else {
                setClientResult(null);
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Calculation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const pondVolume = pondArea && waterDepth
        ? (parseFloat(pondArea) * parseFloat(waterDepth))
        : null;

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Product Dosage</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Pond & Dosage Settings</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="Pond Area (m²)"
                                value={pondArea}
                                onChangeText={setPondArea}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 5000"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="Water Depth (m)"
                                value={waterDepth}
                                onChangeText={setWaterDepth}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 1.2"
                                required
                            />
                        </View>
                    </View>
                    <Input
                        label="Target Concentration (ppm / mg/L)"
                        value={targetPpm}
                        onChangeText={setTargetPpm}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 5.0"
                        required
                    />
                    <Input
                        label="Product Concentration (%)"
                        value={concentration}
                        onChangeText={setConcentration}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 100 (default)"
                        hint="Leave empty for 100% pure product"
                    />

                    <Button title="Calculate" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {pondVolume !== null && pondVolume > 0 && (
                    <Card variant="flat" style={styles.volumeCard}>
                        <Text style={styles.volumeLabel}>Pond Volume</Text>
                        <Text style={styles.volumeValue}>{pondVolume.toFixed(0)} m³</Text>
                    </Card>
                )}

                {result && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Required Product Amount</Text>
                        <Text style={styles.resultValue}>{result.amountKg.toFixed(2)}</Text>
                        <Text style={styles.resultUnit}>kg</Text>

                        {clientResult !== null && (
                            <View style={styles.clientResultSection}>
                                <View style={styles.divider} />
                                <Text style={styles.clientLabel}>With {concentration || '100'}% concentration:</Text>
                                <Text style={styles.clientValue}>{clientResult.toFixed(3)} kg</Text>
                                <Text style={styles.clientFormula}>
                                    ({pondVolume?.toFixed(0)} m³ × {targetPpm} ppm) / ({concentration || 100}% × 10,000)
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
        paddingHorizontal: theme.spacing[4],
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: theme.spacing[4],
    },
    volumeCard: {
        marginBottom: theme.spacing[4],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    volumeLabel: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    volumeValue: {
        ...theme.typeScale.h4,
        color: theme.roles.light.primary,
    },
    resultBox: {
        backgroundColor: theme.roles.light.infoBg,
        padding: theme.spacing[8],
        borderRadius: theme.radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.roles.light.infoBorder,
        marginTop: theme.spacing[2],
    },
    resultLabel: {
        ...theme.typeScale.h4,
        color: theme.roles.light.infoBorder,
        marginBottom: theme.spacing[3],
    },
    resultValue: {
        fontSize: 48,
        fontWeight: '700',
        color: theme.roles.light.textPrimary,
    },
    resultUnit: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[2],
    },
    clientResultSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: theme.spacing[3],
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: theme.roles.light.borderDefault,
        marginVertical: theme.spacing[3],
    },
    clientLabel: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[1],
    },
    clientValue: {
        ...theme.typeScale.h4,
        color: theme.roles.light.primary,
        marginBottom: theme.spacing[2],
    },
    clientFormula: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textTertiary,
        textAlign: 'center',
    },
});
