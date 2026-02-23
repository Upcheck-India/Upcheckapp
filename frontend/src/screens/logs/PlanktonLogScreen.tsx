import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, typography, spacing } from '../../theme';
import { logResourcesApi } from '../../api/logResources';

export const PlanktonLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [density, setDensity] = useState('');
    const [dominantSpecies, setDominantSpecies] = useState('');
    const [diversityIndex, setDiversityIndex] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const recordedAt = new Date(`${date}T12:00:00Z`).toISOString();

        try {
            await logResourcesApi.createPlankton({
                pondId,
                recordedAt,
                density: density ? parseFloat(density) : undefined,
                dominantSpecies: dominantSpecies.trim() || undefined,
                diversityIndex: diversityIndex ? parseFloat(diversityIndex) : undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save plankton record');
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
                <Text style={styles.title}>Plankton Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    <Input
                        label="Density (cells/mL)"
                        value={density}
                        onChangeText={setDensity}
                        keyboardType="number-pad"
                        placeholder="e.g. 500000"
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Composition</Text>
                    <Input
                        label="Dominant Species"
                        value={dominantSpecies}
                        onChangeText={setDominantSpecies}
                        placeholder="e.g. Diatoms, Green Algae"
                    />
                    <Input
                        label="Diversity Index"
                        value={diversityIndex}
                        onChangeText={setDiversityIndex}
                        keyboardType="decimal-pad"
                        placeholder="0.0 - 5.0"
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Bloom color, crash risks..."
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
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
});
