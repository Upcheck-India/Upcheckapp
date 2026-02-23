import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ParameterInput } from '../../components/forms/ParameterInput';
import { theme } from '../../theme';
import { waterQualityApi } from '../../api/waterQuality';

export const WaterQualityLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));

    const [ph, setPh] = useState('');
    const [doValue, setDoValue] = useState('');
    const [temperature, setTemperature] = useState('');
    const [salinity, setSalinity] = useState('');
    const [ammonia, setAmmonia] = useState('');
    const [nitrite, setNitrite] = useState('');
    const [alkalinity, setAlkalinity] = useState('');
    const [transparency, setTransparency] = useState('');

    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);

        // Combine date and time for ISO string
        const recordedAt = new Date(`${date}T${time}:00Z`).toISOString();

        try {
            await waterQualityApi.create({
                pondId,
                recordedAt,
                ph: ph ? parseFloat(ph) : undefined,
                do: doValue ? parseFloat(doValue) : undefined,
                temperature: temperature ? parseFloat(temperature) : undefined,
                salinity: salinity ? parseFloat(salinity) : undefined,
                ammonia: ammonia ? parseFloat(ammonia) : undefined,
                nitrite: nitrite ? parseFloat(nitrite) : undefined,
                alkalinity: alkalinity ? parseFloat(alkalinity) : undefined,
                transparency: transparency ? parseFloat(transparency) : undefined,
                notes: notes.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save water quality log');
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
                <Text style={styles.title}>Water Quality</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" required />
                        </View>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Physical Parameters</Text>
                    <View style={styles.row}>
                        <ParameterInput label="Temperature" unit="°C" value={temperature} onChangeText={setTemperature} parameterKey="temperature" />
                        <View style={styles.spacer} />
                        <ParameterInput label="Transparency" unit="cm" value={transparency} onChangeText={setTransparency} parameterKey="transparency" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label="Salinity" unit="ppt" value={salinity} onChangeText={setSalinity} parameterKey="salinity" />
                        <View style={styles.spacer} />
                        <View style={styles.halfCol} />
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Chemical Parameters</Text>
                    <View style={styles.row}>
                        <ParameterInput label="pH" value={ph} onChangeText={setPh} parameterKey="ph" />
                        <View style={styles.spacer} />
                        <ParameterInput label="DO" unit="mg/L" value={doValue} onChangeText={setDoValue} parameterKey="do" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label="Ammonia" unit="mg/L" value={ammonia} onChangeText={setAmmonia} parameterKey="ammonia" />
                        <View style={styles.spacer} />
                        <ParameterInput label="Nitrite" unit="mg/L" value={nitrite} onChangeText={setNitrite} parameterKey="nitrite" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label="Alkalinity" unit="mg/L" value={alkalinity} onChangeText={setAlkalinity} parameterKey="alkalinity" />
                        <View style={styles.spacer} />
                        <View style={styles.halfCol} />
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Input
                        label="Notes / Observations"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any unusual observations..."
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title="Save Log"
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
    },
    halfCol: {
        flex: 1,
    },
    spacer: {
        width: theme.spacing[4],
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[8],
    },
});
