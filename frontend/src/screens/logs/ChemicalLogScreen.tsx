import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { logResourcesApi } from '../../api/logResources';

export const ChemicalLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [chemicalType, setChemicalType] = useState('Chlorine');
    const [productName, setProductName] = useState('');
    const [dosage, setDosage] = useState('');
    const [unit, setUnit] = useState('kg');
    const [reason, setReason] = useState('Water preparation');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!productName || !dosage || isNaN(parseFloat(dosage))) {
            Alert.alert('Validation Error', 'Product name and valid dosage are required');
            return;
        }

        setIsLoading(true);
        const recordedAt = new Date(`${date}T12:00:00Z`).toISOString();

        try {
            await logResourcesApi.createChemical({
                pondId,
                recordedAt,
                chemicalType,
                productName: productName.trim(),
                dosage: parseFloat(dosage),
                unit: unit.trim() || 'kg',
                applicationMethod: 'Broadcast',
                reason: reason.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save chemical record');
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
                <Text style={styles.title}>Chemical Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input label="Chemical Type" value={chemicalType} onChangeText={setChemicalType} />
                    <Input label="Product Name *" value={productName} onChangeText={setProductName} required />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Application</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Dosage *" value={dosage} onChangeText={setDosage} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="e.g. kg, ml, L" />
                        </View>
                    </View>
                    <Input label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Sterilization, bloom control" />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                    />
                </Card>

                <Button title="Save Record" onPress={handleSave} loading={isLoading} style={styles.saveBtn} />
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
