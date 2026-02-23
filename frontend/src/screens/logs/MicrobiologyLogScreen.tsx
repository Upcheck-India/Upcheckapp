import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { logResourcesApi } from '../../api/logResources';

export const MicrobiologyLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vibrioCount, setVibrioCount] = useState('');
    const [totalBacteria, setTotalBacteria] = useState('');
    const [greenVibrio, setGreenVibrio] = useState('');
    const [yellowVibrio, setYellowVibrio] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!vibrioCount || isNaN(parseFloat(vibrioCount))) {
            Alert.alert('Validation', 'Total Vibrio Count is required');
            return;
        }

        setIsLoading(true);
        const recordedAt = new Date(`${date}T12:00:00Z`).toISOString();

        try {
            await logResourcesApi.createMicrobiology({
                pondId,
                recordedAt,
                vibrioCount: parseFloat(vibrioCount),
                totalBacteriaCount: totalBacteria ? parseFloat(totalBacteria) : undefined,
                greenVibrioCount: greenVibrio ? parseFloat(greenVibrio) : undefined,
                yellowVibrioCount: yellowVibrio ? parseFloat(yellowVibrio) : undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save microbiology record');
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
                <Text style={styles.title}>Microbiology Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input label="Total Bacteria (CFU/mL)" value={totalBacteria} onChangeText={setTotalBacteria} keyboardType="number-pad" />
                    <Input label="Total Vibrio (CFU/mL) *" value={vibrioCount} onChangeText={setVibrioCount} keyboardType="number-pad" required />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Vibrio Breakdown</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Green (CFU/mL)" value={greenVibrio} onChangeText={setGreenVibrio} keyboardType="number-pad" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Yellow (CFU/mL)" value={yellowVibrio} onChangeText={setYellowVibrio} keyboardType="number-pad" />
                        </View>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="TCBS plate observations..."
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
