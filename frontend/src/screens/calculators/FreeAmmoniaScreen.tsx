import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { calculatorsApi, FreeAmmoniaResponse } from '../../api/calculators';

export const FreeAmmoniaScreen = ({ navigation }: any) => {
    const [tan, setTan] = useState('');
    const [temperature, setTemperature] = useState('');
    const [ph, setPh] = useState('');
    const [salinity, setSalinity] = useState('15'); // Default brackish water

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<FreeAmmoniaResponse | null>(null);

    const handleCalculate = async () => {
        if (!tan || !temperature || !ph || !salinity) {
            Alert.alert('Validation Error', 'All physical/chemical parameters are required');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateFreeAmmonia({
                totalAmmoniaNitrogen: parseFloat(tan),
                temperature: parseFloat(temperature),
                ph: parseFloat(ph),
                salinity: parseFloat(salinity),
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to calculate free ammonia');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Free Ammonia Calculator</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Water Parameters</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="TAN (mg/L) *" value={tan} onChangeText={setTan} keyboardType="decimal-pad" placeholder="e.g. 1.5" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="pH *" value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="e.g. 8.2" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Temp (°C) *" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" placeholder="e.g. 29" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Salinity (ppt) *" value={salinity} onChangeText={setSalinity} keyboardType="decimal-pad" placeholder="e.g. 15" />
                        </View>
                    </View>

                    <Button title="Calculate NH₃" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {result && (
                    <View style={[styles.resultBox, result.toxicLevel ? styles.resultBoxToxic : styles.resultBoxSafe]}>
                        <MaterialCommunityIcons
                            name={result.toxicLevel ? "alert-circle" : "check-circle"}
                            size={48}
                            color={result.toxicLevel ? Colors.error : Colors.success}
                            style={styles.resultIcon}
                        />
                        <Text style={[styles.resultLabel, { color: result.toxicLevel ? Colors.error : Colors.success }]}>
                            Free Ammonia (NH₃) Limit
                        </Text>
                        <Text style={styles.resultValue}>{result.freeAmmonia.toFixed(4)} mg/L</Text>

                        {result.toxicLevel ? (
                            <Text style={styles.toxicText}>DANGER: Toxic levels of free ammonia detected! Reduce feeding or perform water exchange immediately.</Text>
                        ) : (
                            <Text style={styles.safeText}>NH₃ levels are within acceptable limits (&lt;0.1 mg/L for L. vannamei).</Text>
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
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    backBtn: {
        padding: spacing.md,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    card: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: spacing.md,
    },
    resultBox: {
        padding: spacing.xl,
        borderRadius: radius.md,
        alignItems: 'center',
        borderWidth: 2,
        marginTop: spacing.md,
    },
    resultBoxSafe: {
        backgroundColor: Colors.success + '15',
        borderColor: Colors.success,
    },
    resultBoxToxic: {
        backgroundColor: Colors.error + '15',
        borderColor: Colors.error,
    },
    resultIcon: {
        marginBottom: spacing.sm,
    },
    resultLabel: {
        ...typography.h4,
        marginBottom: spacing.xs,
    },
    resultValue: {
        fontSize: 40,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    toxicText: {
        ...typography.bodyMedium,
        color: Colors.error,
        textAlign: 'center',
        fontWeight: '600',
    },
    safeText: {
        ...typography.bodyMedium,
        color: Colors.success,
        textAlign: 'center',
        fontWeight: '600',
    },
});
