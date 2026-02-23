import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing } from '../../theme';
import { cropsApi } from '../../api/crops';

export const CreateCycleScreen = ({ route, navigation }: any) => {
    const { pondId } = route.params;
    const [stockingDate, setStockingDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalSeed, setTotalSeed] = useState('');
    const [species, setSpecies] = useState('Vannamei');
    const [initialAgeDays, setInitialAgeDays] = useState('0');

    const [targetSurvivalRate, setTargetSurvivalRate] = useState('85');
    const [targetSizeG, setTargetSizeG] = useState('15');
    const [targetFcr, setTargetFcr] = useState('1.4');

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ totalSeed?: string; species?: string }>({});

    const handleSave = async () => {
        if (!totalSeed || isNaN(parseInt(totalSeed))) {
            setErrors({ totalSeed: 'Valid total seed count is required' });
            return;
        }
        if (!species.trim()) {
            setErrors({ ...errors, species: 'Species is required' });
            return;
        }

        setErrors({});
        setIsLoading(true);

        try {
            await cropsApi.create({
                pondId,
                stockingDate,
                totalSeed: parseInt(totalSeed, 10),
                species: species.trim(),
                initialAgeDays: parseInt(initialAgeDays, 10) || 0,
                targetSurvivalRate: parseFloat(targetSurvivalRate) || 85,
                targetSizeG: parseFloat(targetSizeG) || 15,
                targetFcr: parseFloat(targetFcr) || 1.4,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to start cycle');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                {/* Basic Info */}
                <Input
                    label="Stocking Date (YYYY-MM-DD)"
                    value={stockingDate}
                    onChangeText={setStockingDate}
                    placeholder="2026-01-01"
                    required
                />
                <Input
                    label="Total Seed (Count)"
                    value={totalSeed}
                    onChangeText={setTotalSeed}
                    keyboardType="number-pad"
                    placeholder="e.g. 500000"
                    error={errors.totalSeed}
                    required
                />
                <Input
                    label="Species"
                    value={species}
                    onChangeText={setSpecies}
                    placeholder="e.g. Vannamei"
                    error={errors.species}
                    required
                />
                <Input
                    label="Initial Age (Days)"
                    value={initialAgeDays}
                    onChangeText={setInitialAgeDays}
                    keyboardType="number-pad"
                />

                {/* Targets */}
                <View style={styles.row}>
                    <View style={styles.halfCol}>
                        <Input label="Target SR (%)" value={targetSurvivalRate} onChangeText={setTargetSurvivalRate} keyboardType="decimal-pad" />
                    </View>
                    <View style={styles.halfCol}>
                        <Input label="Target FCR" value={targetFcr} onChangeText={setTargetFcr} keyboardType="decimal-pad" />
                    </View>
                </View>

                <Input label="Target Size (g)" value={targetSizeG} onChangeText={setTargetSizeG} keyboardType="decimal-pad" />

                <Button
                    title="Start Production Cycle"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        paddingTop: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfCol: {
        flex: 1,
    },
    saveBtn: {
        marginTop: spacing.lg,
    },
});
