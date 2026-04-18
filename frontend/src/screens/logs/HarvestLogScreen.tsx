import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { harvestsApi } from '../../api/harvests';

export const HarvestLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName, cropId } = route.params;

    const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
    const [weightKg, setWeightKg] = useState('');
    const [harvestType, setHarvestType] = useState<'partial' | 'full'>('partial');
    const [averageSize, setAverageSize] = useState('');
    const [salePriceTotal, setSalePriceTotal] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!weightKg) {
            Alert.alert('Validation Error', 'Weight is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await harvestsApi.create({
                cropId,
                harvestDate,
                weightKg: parseFloat(weightKg),
                harvestType,
                averageSize: averageSize ? parseFloat(averageSize) : undefined,
                salePriceTotal: salePriceTotal ? parseFloat(salePriceTotal) : undefined,
                buyerName: buyerName || undefined,
            });

            navigation.goBack();
        } catch (error) {
            console.error('Failed to log harvest', error);
            Alert.alert('Error', 'Failed to log harvest. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Log Harvest</Text>
                    <Text style={styles.subtitle}>{pondName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Harvest Details</Text>

                    <Input
                        label="Harvest Date (YYYY-MM-DD)"
                        value={harvestDate}
                        onChangeText={setHarvestDate}
                        placeholder="e.g. 2025-04-18"
                    />

                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[styles.typeBtn, harvestType === 'partial' && styles.typeBtnActive]}
                            onPress={() => setHarvestType('partial')}
                        >
                            <Text style={[styles.typeText, harvestType === 'partial' && styles.typeTextActive]}>Partial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, harvestType === 'full' && styles.typeBtnActive]}
                            onPress={() => setHarvestType('full')}
                        >
                            <Text style={[styles.typeText, harvestType === 'full' && styles.typeTextActive]}>Full (Close Cycle)</Text>
                        </TouchableOpacity>
                    </View>

                    <Input
                        label="Total Weight (kg)"
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="numeric"
                        placeholder="e.g. 1500"
                    />

                    <Input
                        label="Average Size (g / piece)"
                        value={averageSize}
                        onChangeText={setAverageSize}
                        keyboardType="numeric"
                        placeholder="e.g. 14.5"
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Sales Information (Optional)</Text>

                    <Input
                        label="Buyer Name"
                        value={buyerName}
                        onChangeText={setBuyerName}
                        placeholder="e.g. John's Seafood"
                    />

                    <Input
                        label="Total Sale Price"
                        value={salePriceTotal}
                        onChangeText={setSalePriceTotal}
                        keyboardType="numeric"
                        placeholder="e.g. 50000"
                    />
                </Card>

                <Button
                    title="Save Harvest"
                    onPress={handleSave}
                    loading={isSubmitting}
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
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary, textAlign: 'center' },
    subtitle: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, textAlign: 'center' },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    typeSelector: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[4],
    },
    typeBtn: {
        flex: 1,
        paddingVertical: theme.spacing[3],
        alignItems: 'center',
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    typeBtnActive: {
        backgroundColor: theme.roles.light.primary,
        borderColor: theme.roles.light.primary,
    },
    typeText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textSecondary,
    },
    typeTextActive: {
        color: theme.roles.light.surface,
    },
    saveBtn: {
        marginTop: theme.spacing[2],
    },
});
