import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, spacing } from '../../theme';
import { farmsApi } from '../../api/farms';

export const CreateFarmScreen = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [totalArea, setTotalArea] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string }>({});

    const handleSave = async () => {
        if (!name.trim()) {
            setErrors({ name: 'Farm name is required' });
            return;
        }
        setErrors({});
        setIsLoading(true);

        try {
            await farmsApi.create({
                name: name.trim(),
                location: location.trim() || undefined,
                totalAreaMm: totalArea ? parseFloat(totalArea) : undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create farm');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                <Input
                    label="Farm Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. North Site"
                    error={errors.name}
                    required
                />

                <Input
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Address or Region"
                />

                <Input
                    label="Total Area (Optional)"
                    value={totalArea}
                    onChangeText={setTotalArea}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                />

                <Button
                    title="Save Farm"
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
    saveBtn: {
        marginTop: spacing.lg,
    },
});
