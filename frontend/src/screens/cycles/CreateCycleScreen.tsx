import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { cropsApi } from '../../api/crops';

export const CreateCycleScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
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
            newErrors.name = t('cycles.errorCycleNameRequired');
        }
        if (!stockingCount || isNaN(parseInt(stockingCount))) {
            newErrors.stockingCount = t('cycles.errorStockingCountRequired');
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
            Alert.alert(t('common.error'), error.response?.data?.message || t('cycles.errorStartCycle'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                <Input
                    label={t('cycles.fieldCycleName')}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('cycles.placeholderCycleName')}
                    error={errors.name}
                    required
                />
                <Input
                    label={t('cycles.fieldStockingDate')}
                    value={stockingDate}
                    onChangeText={setStockingDate}
                    placeholder={t('cycles.placeholderStockingDate')}
                    required
                />
                <Input
                    label={t('cycles.fieldStockingCount')}
                    value={stockingCount}
                    onChangeText={setStockingCount}
                    keyboardType="number-pad"
                    placeholder={t('cycles.placeholderStockingCount')}
                    error={errors.stockingCount}
                    required
                />
                <Input
                    label={t('cycles.fieldSpeciesType')}
                    value={speciesType}
                    onChangeText={setSpeciesType}
                    placeholder={t('cycles.placeholderSpeciesType')}
                />
                <Input
                    label={t('cycles.fieldSeedType')}
                    value={seedType}
                    onChangeText={setSeedType}
                    placeholder={t('cycles.placeholderSeedType')}
                />

                <Button
                    title={t('cycles.startCycle')}
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
