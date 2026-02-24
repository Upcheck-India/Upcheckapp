import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { samplingApi } from '../../api/sampling';

export const SamplingLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mbwG, setMbwG] = useState('');
    const [totalSamples, setTotalSamples] = useState('');
    const [biomassEstimation, setBiomassEstimation] = useState('');
    const [srEstimation, setSrEstimation] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!mbwG || isNaN(parseFloat(mbwG))) {
            Alert.alert('Validation Error', 'Mean body weight is required');
            return;
        }

        setIsLoading(true);

        try {
            await samplingApi.create({
                pondId,
                samplingDate: date,
                mbwG: parseFloat(mbwG),
                totalSamples: totalSamples ? parseInt(totalSamples, 10) : undefined,
                biomassEstimationKg: biomassEstimation ? parseFloat(biomassEstimation) : undefined,
                srEstimationPercent: srEstimation ? parseFloat(srEstimation) : undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save sampling record');
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
                <Text style={styles.title}>Sampling Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Measurements</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="MBW (g) *" value={mbwG} onChangeText={setMbwG} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Total Samples" value={totalSamples} onChangeText={setTotalSamples} keyboardType="number-pad" placeholder="0" />
                        </View>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Population Estimates</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Est. SR (%)" value={srEstimation} onChangeText={setSrEstimation} keyboardType="decimal-pad" placeholder="0-100" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Est. Biomass (kg)" value={biomassEstimation} onChangeText={setBiomassEstimation} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes / Abnormalities"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any visible signs of disease, molting state..."
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
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
});
