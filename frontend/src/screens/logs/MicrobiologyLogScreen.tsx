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
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalBacillus, setTotalBacillus] = useState('');
    const [totalVibrio, setTotalVibrio] = useState('');
    const [greenVibrio, setGreenVibrio] = useState('');
    const [yellowVibrio, setYellowVibrio] = useState('');
    const [luminescentBacteria, setLuminescentBacteria] = useState('');
    const [note, setNote] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);

        try {
            await logResourcesApi.createMicrobiology({
                cropId,
                measurementDate: date,
                totalBacillusCfuMl: totalBacillus ? parseFloat(totalBacillus) : undefined,
                totalVibrioCountTvcCfuMl: totalVibrio ? parseFloat(totalVibrio) : undefined,
                greenVibrioCountTvcCfuMl: greenVibrio ? parseFloat(greenVibrio) : undefined,
                yellowVibrioCountTvcCfuMl: yellowVibrio ? parseFloat(yellowVibrio) : undefined,
                luminescentBacteriaLbCfuMl: luminescentBacteria ? parseFloat(luminescentBacteria) : undefined,
                note: note.trim() || undefined,
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
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Bacteria Counts (CFU/mL)</Text>
                    <Input label="Total Bacillus" value={totalBacillus} onChangeText={setTotalBacillus} keyboardType="number-pad" placeholder="0" />
                    <Input label="Total Vibrio (TVC)" value={totalVibrio} onChangeText={setTotalVibrio} keyboardType="number-pad" placeholder="0" />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Vibrio Breakdown (CFU/mL)</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Green Vibrio" value={greenVibrio} onChangeText={setGreenVibrio} keyboardType="number-pad" placeholder="0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Yellow Vibrio" value={yellowVibrio} onChangeText={setYellowVibrio} keyboardType="number-pad" placeholder="0" />
                        </View>
                    </View>
                    <Input label="Luminescent Bacteria" value={luminescentBacteria} onChangeText={setLuminescentBacteria} keyboardType="number-pad" placeholder="0" />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes"
                        value={note}
                        onChangeText={setNote}
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
