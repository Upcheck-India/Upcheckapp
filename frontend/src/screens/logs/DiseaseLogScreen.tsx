import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { ChoiceChips } from '../../components/health/ChoiceChips';
import { HealthPhotoPicker } from '../../components/health/HealthPhotoPicker';
import { theme } from '../../theme';
import { diseaseApi } from '../../api/diseases';
import { apiErrorMessage } from '../../api/errors';
import { findBannedSubstances } from '../../features/bannedSubstances';
import { useBannedSubstancesStore } from '../../features/bannedSubstancesStore';
import { useDiseaseLibrary } from '../../features/diseaseLibrary';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate } from '../../utils/localDate';
import { saveRecord } from '../../sync/recordSync';
import {
    CONFIRMED_BY,
    DISEASE_SEVERITIES,
    HEALTH_SIGNS,
    healthObservationsApi,
    normaliseSeverity,
} from '../../api/healthObservations';

type Severity = (typeof DISEASE_SEVERITIES)[number];
type ConfirmedBy = (typeof CONFIRMED_BY)[number];


export const DiseaseLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId, editRecord, diseaseId: prefillDisease, signs: prefillSigns } = route.params;
    const isEditing = !!editRecord;

    const [date, setDate] = useState(editRecord?.recordedDate ? String(editRecord.recordedDate).slice(0, 10) : todayLocalISODate());
    // Cached + persisted (D6/H2): the picker works with no signal.
    const library = useDiseaseLibrary();
    const diseases = library.data ?? [];
    const [diseaseId, setDiseaseId] = useState<string>(editRecord?.diseaseId ?? prefillDisease ?? '');
    const [signs, setSigns] = useState<string[]>(editRecord?.symptomSigns ?? prefillSigns ?? []);
    const [severity, setSeverity] = useState<Severity | null>(
        editRecord ? (editRecord.severity ?? normaliseSeverity(editRecord.severityAtDetection)) : null,
    );
    const [affectedPct, setAffectedPct] = useState(editRecord?.affectedPct != null ? String(editRecord.affectedPct) : '');
    const [confirmedBy, setConfirmedBy] = useState<ConfirmedBy | null>(editRecord?.confirmedBy ?? null);
    const [labName, setLabName] = useState(editRecord?.labName ?? '');
    const [photos, setPhotos] = useState<string[]>(editRecord?.photoUrls ?? []);
    // Old "Symptoms: X. Action: Y" notes are shown and kept as written — never parsed.
    const [notes, setNotes] = useState(editRecord?.notes ?? '');
    const [isLoading, setIsLoading] = useState(false);

    // Symptom chips start from what was seen in this pond in the last 3 days.
    useEffect(() => {
        if (isEditing || prefillSigns?.length || !pondId) return;
        let alive = true;
        healthObservationsApi
            .listForPond(pondId, 3)
            .then(({ data }) => {
                const seen = [...new Set((data ?? []).filter((o) => o.level !== 'none').map((o) => o.sign as string))];
                if (alive && seen.length) setSigns((cur) => (cur.length ? cur : seen));
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [isEditing, pondId, prefillSigns]);

    const bannedList = useBannedSubstancesStore((s) => s.substances);
    const flagged = findBannedSubstances(notes, bannedList);
    const hasBanned = flagged.some((s) => s.category === 'banned');

    const toggleSign = (s: string) => setSigns((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

    const performSave = async (thenTreatment = false) => {
        const pct = affectedPct.trim() ? parseFloat(affectedPct) : undefined;
        if (pct !== undefined && (isNaN(pct) || pct < 0 || pct > 100)) {
            Alert.alert(t('common.error'), t('health.affectedPctInvalid'));
            return;
        }
        setIsLoading(true);
        try {
            const confirmed = confirmedBy && confirmedBy !== 'suspected';
            const payload = {
                cropId,
                diseaseId,
                recordedDate: date,
                symptomSigns: signs,
                ...(severity ? { severity, severityAtDetection: severity } : {}),
                ...(pct !== undefined ? { affectedPct: pct } : {}),
                ...(confirmedBy ? { confirmedBy } : {}),
                ...(confirmed ? { confirmedOn: date, labName: labName.trim() || undefined } : {}),
                photoUrls: photos,
                notes: notes.trim() || undefined,
            };
            let recordId: string = editRecord?.id;
            if (isEditing) {
                await diseaseApi.update(editRecord.id, payload);
                showToast({ message: t('common.savedSuccess'), type: 'success' });
            } else {
                const res = await saveRecord({ entity: 'disease', endpoint: '/disease/record', payload });
                recordId = res.id;
                showToast({
                    message: res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('common.savedSuccess'),
                    type: 'success',
                });
            }
            if (thenTreatment) {
                // "What did you do?" → a treatment linked to this record.
                // TODO(D2 integration): TreatmentLog does not read `reason` /
                // `diseaseRecordId` yet — D2 adds treatments.disease_record_id and
                // the prefill; until then this opens a blank treatment form.
                navigation.replace('TreatmentLog', { pondId, pondName, cropId, reason: 'disease', diseaseRecordId: recordId });
            } else {
                navigation.goBack();
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), apiErrorMessage(error, t('logs.disease_errorSave')));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = (thenTreatment = false) => {
        if (!diseaseId) {
            Alert.alert(t('common.error'), t('logs.disease_validationSelectDisease'));
            return;
        }
        if (flagged.length > 0) {
            const names = flagged.map((s) => s.name).join(', ');
            Alert.alert(
                hasBanned ? t('logs.disease_bannedTitle') : t('logs.disease_restrictedTitle'),
                hasBanned ? t('logs.disease_bannedBody', { names }) : t('logs.disease_restrictedBody', { names }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('logs.disease_saveAnyway'), style: 'destructive', onPress: () => void performSave(thenTreatment) },
                ],
            );
            return;
        }
        void performSave(thenTreatment);
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{isEditing ? t('logs.editTitle', 'Edit Reading') : t('logs.disease_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {!!pondName && <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>}

                {flagged.length > 0 ? (
                    <AlertBanner
                        type="warning"
                        title={hasBanned ? t('logs.disease_bannerBannedTitle') : t('logs.disease_bannerRestrictedTitle')}
                        message={
                            hasBanned
                                ? t('logs.disease_bannerBannedMsg', { names: flagged.map((s) => s.name).join(', ') })
                                : t('logs.disease_bannerRestrictedMsg', { names: flagged.map((s) => s.name).join(', ') })
                        }
                    />
                ) : null}

                <Card style={styles.card}>
                    <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />

                    <Text style={styles.pickerLabel}>{t('logs.disease_labelSuspectedDisease')}</Text>
                    {library.isPending && !diseases.length ? (
                        <ActivityIndicator color={theme.roles.light.primary} style={{ marginVertical: theme.spacing[3] }} />
                    ) : diseases.length === 0 ? (
                        <Text style={styles.pickerEmpty}>{t('logs.disease_noDiseasesInLibrary')}</Text>
                    ) : (
                        <View style={styles.chipList}>
                            {diseases.map((d) => {
                                const selected = d.id === diseaseId;
                                return (
                                    <TouchableOpacity
                                        key={d.id}
                                        style={[styles.chip, selected && styles.chipSelected]}
                                        onPress={() => setDiseaseId(d.id)}
                                        testID={`disease-${d.id}`}
                                    >
                                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.pickerLabel}>{t('health.signsSeen')}</Text>
                    <View style={styles.chipList}>
                        {HEALTH_SIGNS.map((s) => {
                            const on = signs.includes(s);
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, on && styles.chipSelected]}
                                    onPress={() => toggleSign(s)}
                                    accessibilityState={{ selected: on }}
                                >
                                    <Text style={[styles.chipText, on && styles.chipTextSelected]}>{t(`health.sign.${s}`)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.pickerLabel}>{t('logs.disease_labelSeverity')}</Text>
                    <ChoiceChips
                        options={DISEASE_SEVERITIES.map((k) => ({ key: k, label: t(`health.severity.${k}`) }))}
                        value={severity}
                        onChange={setSeverity}
                    />
                    <View style={{ height: theme.spacing[3] }} />
                    <Input
                        label={t('health.affectedPct')}
                        value={affectedPct}
                        onChangeText={setAffectedPct}
                        keyboardType="decimal-pad"
                        placeholder="0–100"
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.pickerLabel}>{t('health.confirmedBy')}</Text>
                    <ChoiceChips
                        options={CONFIRMED_BY.map((k) => ({ key: k, label: t(`health.confirmed.${k}`) }))}
                        value={confirmedBy}
                        onChange={setConfirmedBy}
                    />
                    {confirmedBy && confirmedBy !== 'suspected' && (
                        <View style={{ marginTop: theme.spacing[3] }}>
                            <Input label={t('health.labName')} value={labName} onChangeText={setLabName} />
                        </View>
                    )}
                </Card>

                {!!pondId && (
                    <Card style={styles.card}>
                        <HealthPhotoPicker
                            pondId={pondId}
                            value={photos}
                            onChange={setPhotos}
                            existingUrls={editRecord?.photoSignedUrls}
                        />
                    </Card>
                )}

                <Card style={styles.card}>
                    <Input
                        label={t('common.notes', 'Notes')}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title={isEditing ? t('logs.updateBtn', 'Update') : t('logs.saveRecord')}
                    onPress={() => handleSave(false)}
                    loading={isLoading}
                    style={[styles.saveBtn, styles.dangerBtn]}
                />
                {!isEditing && (
                    <Button
                        title={t('health.saveAndLogTreatment')}
                        variant="outlined"
                        onPress={() => handleSave(true)}
                        disabled={isLoading}
                        style={styles.saveBtn}
                    />
                )}
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
        backgroundColor: theme.roles.light.dangerText + '20',
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.dangerText },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[4] },
    card: { marginBottom: theme.spacing[4] },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    pickerLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[2],
        marginTop: theme.spacing[2],
    },
    pickerEmpty: { ...theme.typeScale.bodySmall, color: theme.roles.light.textDisabled, marginBottom: theme.spacing[3] },
    chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    chip: {
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    chipSelected: { borderColor: theme.roles.light.dangerText, backgroundColor: theme.roles.light.dangerText + '15' },
    chipText: { ...theme.typeScale.bodySmall, color: theme.roles.light.textPrimary },
    chipTextSelected: { color: theme.roles.light.dangerText, fontWeight: '700' },
    saveBtn: { marginTop: theme.spacing[2] },
    dangerBtn: { backgroundColor: theme.roles.light.dangerText },
});
