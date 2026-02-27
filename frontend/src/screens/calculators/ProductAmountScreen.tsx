import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
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
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
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
    calcBtn: {
        marginTop: theme.spacing[4],
    },
    resultBox: {
        backgroundColor: theme.roles.light.infoBg,
        padding: theme.spacing[8],
        borderRadius: theme.radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.roles.light.infoBorder,
        marginTop: theme.spacing[4],
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
});
