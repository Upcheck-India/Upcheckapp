import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { calculatorsApi, ProductAmountResponse } from '../../api/calculators';

export const ProductAmountScreen = ({ navigation }: any) => {
    const [pondVolume, setPondVolume] = useState('');
    const [targetPpm, setTargetPpm] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ProductAmountResponse | null>(null);

    const handleCalculate = async () => {
        if (!pondVolume || !targetPpm) {
            Alert.alert('Validation Error', 'Please enter pond volume and target concentration');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateProductAmount({
                pondVolumeM3: parseFloat(pondVolume),
                targetDosagePpm: parseFloat(targetPpm),
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Calculation failed');
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
                <Text style={styles.title}>Product Amount Calculator</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Dosage Settings</Text>
                    <Input
                        label="Pond Volume (m³)"
                        value={pondVolume}
                        onChangeText={setPondVolume}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 2500"
                        required
                    />
                    <Input
                        label="Target Concentration (ppm/mg/L)"
                        value={targetPpm}
                        onChangeText={setTargetPpm}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 5.0"
                        required
                    />

                    <Button title="Calculate" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {result && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Required Product Amount</Text>
                        <Text style={styles.resultValue}>{result.productAmountKg.toFixed(2)}</Text>
                        <Text style={styles.resultUnit}>kg or Liters</Text>
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
    calcBtn: {
        marginTop: spacing.md,
    },
    resultBox: {
        backgroundColor: Colors.info + '15',
        padding: spacing.xl,
        borderRadius: radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.info,
        marginTop: spacing.md,
    },
    resultLabel: {
        ...typography.h4,
        color: Colors.info,
        marginBottom: spacing.sm,
    },
    resultValue: {
        fontSize: 48,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    resultUnit: {
        ...typography.bodyLarge,
        color: Colors.textSecondary,
        marginTop: spacing.xs,
    },
});
