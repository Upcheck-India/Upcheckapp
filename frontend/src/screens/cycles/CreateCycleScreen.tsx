import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { cropsApi } from '../../api/crops';

export const CreateCycleScreen = ({ route, navigation }: any) => {
    const { pondId } = route.params;
    const [name, setName] = useState('');
    const [stockingDate, setStockingDate] = useState(new Date().toISOString().split('T')[0]);
    const [stockingCount, setStockingCount] = useState('');
    const [speciesType, setSpeciesType] = useState('Vannamei');
    const [seedType, setSeedType] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; stockingCount?: string }>({});

    const handleSave = async () => {
        const newErrors: { name?: string; stockingCount?: string } = {};
        if (!name.trim()) {
            newErrors.name = 'Cycle name is required';
        }
        if (!stockingCount || isNaN(parseInt(stockingCount))) {
            newErrors.stockingCount = 'Valid stocking count is required';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setIsLoading(true);

        try {
            await cropsApi.create({
                pondId,
                name: name.trim(),
                stockingDate,
                stockingCount: parseInt(stockingCount, 10),
                speciesType: speciesType.trim() || undefined,
                seedType: seedType.trim() || undefined,
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
                <Input
                    label="Cycle Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Cycle 1"
                    error={errors.name}
                    required
                />
                <Input
                    label="Stocking Date (YYYY-MM-DD)"
                    value={stockingDate}
                    onChangeText={setStockingDate}
                    placeholder="2026-01-01"
                    required
                />
                <Input
                    label="Stocking Count"
                    value={stockingCount}
                    onChangeText={setStockingCount}
                    keyboardType="number-pad"
                    placeholder="e.g. 500000"
                    error={errors.stockingCount}
                    required
                />
                <Input
                    label="Species Type"
                    value={speciesType}
                    onChangeText={setSpeciesType}
                    placeholder="e.g. Vannamei"
                />
                <Input
                    label="Seed Type (Optional)"
                    value={seedType}
                    onChangeText={setSeedType}
                    placeholder="e.g. PL-10"
                />

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
        paddingTop: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    saveBtn: {
        marginTop: theme.spacing[6],
    },
});
