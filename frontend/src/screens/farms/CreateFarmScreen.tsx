import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { farmsApi } from '../../api/farms';

export const CreateFarmScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [totalArea, setTotalArea] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string }>({});

    const handleSave = async () => {
        if (!name.trim()) {
            setErrors({ name: t('farms.errorFarmRequired') });
            return;
        }
        setErrors({});
        setIsLoading(true);

        try {
            await farmsApi.create({
                name: name.trim(),
                address: address.trim() || undefined,
                areaHectares: totalArea ? parseFloat(totalArea) : undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('farms.errorCreateFarm'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                <Input
                    label={t('farms.fieldFarmName')}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('farms.placeholderFarmName')}
                    error={errors.name}
                    required
                />

                <Input
                    label={t('farms.fieldAddress')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('farms.placeholderAddress')}
                />

                <Input
                    label={t('farms.fieldArea')}
                    value={totalArea}
                    onChangeText={setTotalArea}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                />

                <Button
                    title={t('farms.saveFarm')}
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
    saveBtn: {
        marginTop: theme.spacing[6],
    },
});
