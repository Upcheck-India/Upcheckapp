import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, typography, spacing } from '../../theme';
import { treatmentsApi } from '../../api/treatments';

export const TreatmentLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [treatmentType, setTreatmentType] = useState('');
    const [productName, setProductName] = useState('');
    const [dosage, setDosage] = useState('');
    const [unit, setUnit] = useState('kg');
    const [applicationMethod, setApplicationMethod] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!treatmentType.trim() || !productName.trim() || !dosage || isNaN(parseFloat(dosage))) {
            Alert.alert('Validation Error', 'Treatment type, product name, and valid dosage are required');
            return;
        }

        setIsLoading(true);
        const recordedAt = new Date(`${date}T12:00:00Z`).toISOString();

        try {
            await treatmentsApi.create({
                pondId,
                recordedAt,
                treatmentType: treatmentType.trim(),
                productName: productName.trim(),
                dosage: parseFloat(dosage),
                unit: unit.trim() || 'kg',
                applicationMethod: applicationMethod.trim() || 'Broadcast',
                reason: reason.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save treatment record');
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
                <Text style={styles.title}>Treatment Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input label="Treatment Type *" value={treatmentType} onChangeText={setTreatmentType} placeholder="e.g. Probiotics, Minerals, Antibiotics" required />
                    <Input label="Product Name *" value={productName} onChangeText={setProductName} placeholder="e.g. AquaBiotex" required />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Application</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Dosage *" value={dosage} onChangeText={setDosage} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="e.g. kg, L, bags" />
                        </View>
                    </View>
                    <Input
                        label="Application Method"
                        value={applicationMethod}
                        onChangeText={setApplicationMethod}
                        placeholder="e.g. Mixed with feed, Broadcast to pond"
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Reason for Treatment"
                        value={reason}
                        onChangeText={setReason}
                        placeholder="e.g. Low DO, Vibriosis, Routine maintenance"
                    />
                    <Input
                        label="Additional Notes"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Water conditions, shrimp behavior before tracking..."
                        multiline
                        numberOfLines={3}
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
    subtitle: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        marginBottom: spacing.md,
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
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
});
