import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { Stepper } from '../../components/ui/Stepper';
import { saveRecord } from '../../sync/recordSync';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate } from '../../utils/localDate';
import { mortalityApi } from '../../api/mortalities';
import { apiErrorMessage } from '../../api/errors';
import { ChoiceChips } from '../../components/health/ChoiceChips';
import { HealthPhotoPicker } from '../../components/health/HealthPhotoPicker';
import { MORTALITY_CAUSES } from '../../api/healthObservations';
import { afterMortalitySave, mortality7DayAvg } from '../../features/mortalitySpike';

export const MortalityLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId, editRecord } = route.params;
    const isEditing = !!editRecord;

    const [date, setDate] = useState(editRecord?.recordDate ?? todayLocalISODate());
    const [quantity, setQuantity] = useState(editRecord?.quantity ?? 0);
    const [estimatedWeightKg, setEstimatedWeightKg] = useState(editRecord?.estimatedWeightKg != null ? String(editRecord.estimatedWeightKg) : '');
    const [note, setNote] = useState(editRecord?.note ?? '');
    const [cause, setCause] = useState<string | null>(editRecord?.suspectedCause ?? null);
    const [photos, setPhotos] = useState<string[]>(editRecord?.photoUrls ?? []);

    const [isLoading, setIsLoading] = useState(false);

    /**
     * After a save (D6): a spike asks "Do a health check?"; cause `disease`
     * offers a disease record. The 7-day baseline comes from the crop's
     * mortality list (HTTP-cached offline); without it, no prompt.
     */
    const promptNext = async (savedId: string) => {
        let avg7: number | null = null;
        try {
            const { data } = await mortalityApi.getByCrop(cropId);
            avg7 = mortality7DayAvg(Array.isArray(data) ? data : [], date, savedId);
        } catch {
            /* no baseline → the spike rule sees avg 0, as the brief does */
        }
        const next = afterMortalitySave({ quantity, avg7, cause });
        const params = { pondId, pondName, cropId };
        if (next?.kind === 'health_check') {
            Alert.alert(
                t('health.spikeTitle'),
                next.times ? t('health.spikeBody', { times: next.times }) : t('health.spikeBodyNoBaseline'),
                [
                    { text: t('health.later'), style: 'cancel', onPress: () => navigation.goBack() },
                    { text: t('health.doCheck'), onPress: () => navigation.replace('HealthCheck', { ...params, reason: 'spike' }) },
                ],
            );
        } else if (next?.kind === 'disease') {
            Alert.alert(t('health.logDiseaseTitle'), t('health.logDiseaseBody'), [
                { text: t('health.later'), style: 'cancel', onPress: () => navigation.goBack() },
                { text: t('health.logDisease'), onPress: () => navigation.replace('DiseaseLog', params) },
            ]);
        } else {
            navigation.goBack();
        }
    };

    const handleSave = async () => {
        if (quantity < 0) {
            Alert.alert(t('common.error'), t('logs.mortality_validationQuantity'));
            return;
        }

        setIsLoading(true);

        const payload = {
            cropId,
            recordDate: date,
            quantity,
            estimatedWeightKg: estimatedWeightKg ? parseFloat(estimatedWeightKg) : undefined,
            note: note.trim() || undefined,
            ...(cause ? { suspectedCause: cause } : {}),
            photoUrls: photos,
        };

        try {
            let savedId: string = editRecord?.id;
            if (isEditing) {
                // Editing a specific past record is not a field-logging action,
                // so it goes straight to the API rather than through the
                // offline queue — there's no "this reading must be captured
                // right now, no signal" urgency the way a fresh log has.
                await mortalityApi.update(editRecord.id, payload);
                showToast({ message: t('common.savedSuccess'), type: 'success' });
            } else {
                const res = await saveRecord({
                    entity: 'mortality',
                    endpoint: '/mortality',
                    payload,
                });
                savedId = res.id;
                showToast({
                    message: res.queued
                        ? t('common.savedOffline', 'Saved — will sync when online')
                        : t('common.savedSuccess'),
                    type: 'success',
                });
            }
            await promptNext(savedId);
        } catch (error: any) {
            Alert.alert(t('common.error'), apiErrorMessage(error, t('logs.mortality_errorSave')));
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
                <Text style={styles.title}>{isEditing ? t('logs.editTitle', 'Edit Reading') : t('logs.mortality_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>

                <Card style={styles.card}>
                    <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />
                    <Stepper
                        label={t('logs.mortality_labelQuantity')}
                        value={quantity}
                        onChange={setQuantity}
                        min={0}
                    />
                    {/* D5: education, not a gate. */}
                    <Text style={styles.tip}>{t('biosecurity.carcassTip')}</Text>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('health.suspectedCause')}</Text>
                    <ChoiceChips
                        options={MORTALITY_CAUSES.map((k) => ({ key: k, label: t(`health.cause.${k}`) }))}
                        value={cause}
                        onChange={setCause}
                        testIDPrefix="cause"
                    />
                    {!!pondId && (
                        <View style={{ marginTop: theme.spacing[4] }}>
                            <HealthPhotoPicker
                                pondId={pondId}
                                value={photos}
                                onChange={setPhotos}
                                existingUrls={editRecord?.photoSignedUrls}
                                existingThumbs={editRecord?.photoThumbUrls}
                            />
                        </View>
                    )}
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.mortality_sectionWeight')}</Text>
                    <Input
                        label={t('logs.mortality_labelEstWeight')}
                        value={estimatedWeightKg}
                        onChangeText={setEstimatedWeightKg}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label={t('logs.mortality_labelObservations')}
                        value={note}
                        onChangeText={setNote}
                        placeholder={t('logs.mortality_placeholderObservations')}
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title={isEditing ? t('logs.updateBtn', 'Update') : t('logs.saveRecord')}
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
    tip: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[2],
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
