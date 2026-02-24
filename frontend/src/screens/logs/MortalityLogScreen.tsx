import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { mortalityApi } from '../../api/mortalities';

export const MortalityLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState('');
    const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
    const [note, setNote] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!quantity || isNaN(parseInt(quantity))) {
            Alert.alert('Validation Error', 'Quantity is required');
            return;
        }

        setIsLoading(true);

        try {
            await mortalityApi.create({
                cropId,
                recordDate: date,
                quantity: parseInt(quantity, 10),
                estimatedWeightKg: estimatedWeightKg ? parseFloat(estimatedWeightKg) : undefined,
                note: note.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save mortality record');
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
                <Text style={styles.title}>Mortality Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input
                        label="Quantity (pieces) *"
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="number-pad"
                        placeholder="0"
                        required
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Weight</Text>
                    <Input
                        label="Est. Total Weight (kg)"
                        value={estimatedWeightKg}
                        onChangeText={setEstimatedWeightKg}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Observations / Suspected Cause"
                        value={note}
                        onChangeText={setNote}
                        placeholder="Symptoms, water color changes, etc."
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title="Save Record"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
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
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
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
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
});
