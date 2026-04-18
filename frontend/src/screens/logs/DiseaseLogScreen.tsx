import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { diseaseApi } from '../../api/diseases';

export const DiseaseLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [diseaseId, setDiseaseId] = useState('11111111-1111-1111-1111-111111111111');
    const [severity, setSeverity] = useState('Mild');
    const [symptoms, setSymptoms] = useState('');
    const [actionTaken, setActionTaken] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!diseaseId.trim()) {
            Alert.alert('Validation Error', 'Disease ID is required');
            return;
        }

        setIsLoading(true);

        try {
            // Build notes from all descriptive fields
            const notesParts: string[] = [];
            if (symptoms.trim()) notesParts.push(`Symptoms: ${symptoms.trim()}`);
            if (actionTaken.trim()) notesParts.push(`Action: ${actionTaken.trim()}`);

            await diseaseApi.create({
                cropId,
                diseaseId: diseaseId.trim(),
                recordedDate: date,
                severityAtDetection: severity.trim() || undefined,
                notes: notesParts.length > 0 ? notesParts.join('. ') : undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save disease record');
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
                <Text style={styles.title}>Disease Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input label="Suspected Disease ID *" value={diseaseId} onChangeText={setDiseaseId} placeholder="UUID of Disease" required />
                    <Input label="Severity" value={severity} onChangeText={setSeverity} placeholder="e.g. Mild, Moderate, Severe" />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Observed Symptoms *"
                        value={symptoms}
                        onChangeText={setSymptoms}
                        placeholder="White spots, empty gut, swimming erratically..."
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                        required
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Immediate Action Taken"
                        value={actionTaken}
                        onChangeText={setActionTaken}
                        placeholder="e.g. Isolated pond, emergency harvest, discontinued feeding"
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button title="Save Record" onPress={handleSave} loading={isLoading} style={[styles.saveBtn, styles.dangerBtn]} />
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
        backgroundColor: theme.roles.light.dangerText + '20', // Light red tint for disease alert
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.dangerText,
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
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
    dangerBtn: {
        backgroundColor: theme.roles.light.dangerText,
    }
});
