import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ParameterInput } from '../../components/forms/ParameterInput';
import { theme } from '../../theme';
import { saveRecord } from '../../sync/recordSync';
import { useUIStore } from '../../store/uiStore';

export const WaterQualityLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName } = route.params;

    const [ph, setPh] = useState('');
    const [dissolvedOxygen, setDissolvedOxygen] = useState('');
    const [temperature, setTemperature] = useState('');
    const [salinity, setSalinity] = useState('');
    const [ammonia, setAmmonia] = useState('');
    const [nitrite, setNitrite] = useState('');
    const [nitrate, setNitrate] = useState('');
    const [alkalinity, setAlkalinity] = useState('');
    const [hardness, setHardness] = useState('');
    const [transparency, setTransparency] = useState('');

    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);

        try {
            const res = await saveRecord({
                entity: 'water_quality',
                endpoint: '/water-quality',
                payload: {
                    pondId,
                    recordedAt: new Date().toISOString(),
                    ph: ph ? parseFloat(ph) : undefined,
                    dissolvedOxygen: dissolvedOxygen ? parseFloat(dissolvedOxygen) : undefined,
                    temperature: temperature ? parseFloat(temperature) : undefined,
                    salinity: salinity ? parseFloat(salinity) : undefined,
                    ammonia: ammonia ? parseFloat(ammonia) : undefined,
                    nitrite: nitrite ? parseFloat(nitrite) : undefined,
                    nitrate: nitrate ? parseFloat(nitrate) : undefined,
                    alkalinity: alkalinity ? parseFloat(alkalinity) : undefined,
                    hardness: hardness ? parseFloat(hardness) : undefined,
                    transparency: transparency ? parseFloat(transparency) : undefined,
                    notes: notes.trim() || undefined,
                },
            });
            showToast({
                message: res.queued
                    ? t('common.savedOffline', 'Saved — will sync when online')
                    : t('common.savedSuccess'),
                type: 'success',
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('logs.waterQuality_errorSave'));
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
                <Text style={styles.title}>{t('logs.waterQuality_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.waterQuality_sectionPhysical')}</Text>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelTemperature')} unit="°C" value={temperature} onChangeText={setTemperature} parameterKey="temperature" />
                        <View style={styles.spacer} />
                        <ParameterInput label={t('logs.waterQuality_labelTransparency')} unit="cm" value={transparency} onChangeText={setTransparency} parameterKey="transparency" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelSalinity')} unit="ppt" value={salinity} onChangeText={setSalinity} parameterKey="salinity" />
                        <View style={styles.spacer} />
                        <View style={styles.halfCol} />
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.waterQuality_sectionChemical')}</Text>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelPh')} value={ph} onChangeText={setPh} parameterKey="ph" />
                        <View style={styles.spacer} />
                        <ParameterInput label={t('logs.waterQuality_labelDo')} unit="mg/L" value={dissolvedOxygen} onChangeText={setDissolvedOxygen} parameterKey="do" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelAmmonia')} unit="mg/L" value={ammonia} onChangeText={setAmmonia} parameterKey="ammonia" />
                        <View style={styles.spacer} />
                        <ParameterInput label={t('logs.waterQuality_labelNitrite')} unit="mg/L" value={nitrite} onChangeText={setNitrite} parameterKey="nitrite" />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelAlkalinity')} unit="mg/L" value={alkalinity} onChangeText={setAlkalinity} parameterKey="alkalinity" />
                        <View style={styles.spacer} />
                        <ParameterInput label={t('logs.waterQuality_labelNitrate')} unit="mg/L" value={nitrate} onChangeText={setNitrate} />
                    </View>
                    <View style={styles.row}>
                        <ParameterInput label={t('logs.waterQuality_labelHardness')} unit="mg/L" value={hardness} onChangeText={setHardness} />
                        <View style={styles.spacer} />
                        <View style={styles.halfCol} />
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Input
                        label={t('logs.waterQuality_labelNotesObservations')}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder={t('logs.waterQuality_placeholderNotes')}
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title={t('logs.waterQuality_saveBtn')}
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
