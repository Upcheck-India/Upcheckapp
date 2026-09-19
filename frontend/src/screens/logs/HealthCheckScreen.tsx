/**
 * Health check (spec D6): 11 signs, each None / Few / Many, plus an optional
 * photo. One screen, one save. A sign left untouched is "not checked" and is
 * not written; "None" is written, because "checked, none" is a finding.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChoiceChips } from '../../components/health/ChoiceChips';
import { HealthPhotoPicker } from '../../components/health/HealthPhotoPicker';
import { theme } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate } from '../../utils/localDate';
import { apiErrorMessage } from '../../api/errors';
import { HEALTH_SIGNS, healthObservationsApi, type HealthLevel, type HealthSign } from '../../api/healthObservations';

const LEVELS: HealthLevel[] = ['none', 'few', 'many'];

export const HealthCheckScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId, reason } = route.params ?? {};
    const [levels, setLevels] = useState<Partial<Record<HealthSign, HealthLevel>>>({});
    const [photos, setPhotos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const signs = HEALTH_SIGNS.filter((s) => levels[s]).map((s) => ({ sign: s, level: levels[s]! }));

    const save = async () => {
        if (!signs.length) {
            Alert.alert(t('common.error'), t('health.pickOne'));
            return;
        }
        setSaving(true);
        try {
            const res = await healthObservationsApi.save({
                pondId,
                cropId,
                observedOn: todayLocalISODate(),
                source: 'quick',
                photoUrls: photos.length ? photos : undefined,
                signs,
            });
            showToast({
                message: res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('common.savedSuccess'),
                type: 'success',
            });
            navigation.goBack();
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('health.saveFailed')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('health.checkTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {!!pondName && <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>}
                {reason === 'spike' && <Text style={styles.reason}>{t('health.spikeReason')}</Text>}
                <Text style={styles.hint}>{t('health.checkHint')}</Text>
                <Card style={styles.card}>
                    {HEALTH_SIGNS.map((s) => (
                        <View key={s} style={styles.signRow} testID={`sign-${s}`}>
                            <Text style={styles.signLabel}>{t(`health.sign.${s}`)}</Text>
                            <ChoiceChips
                                options={LEVELS.map((l) => ({ key: l, label: t(`health.level.${l}`) }))}
                                value={levels[s]}
                                onChange={(l) => setLevels((prev) => ({ ...prev, [s]: l ?? undefined }))}
                                testIDPrefix={`level-${s}`}
                            />
                        </View>
                    ))}
                </Card>
                <Card style={styles.card}>
                    <HealthPhotoPicker pondId={pondId} value={photos} onChange={setPhotos} />
                </Card>
                <Button title={t('logs.saveRecord')} onPress={save} loading={saving} disabled={!signs.length} />
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
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    reason: { ...theme.typeScale.bodyMedium, color: theme.roles.light.warningText, marginBottom: theme.spacing[2] },
    hint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary, marginBottom: theme.spacing[4] },
    card: { marginBottom: theme.spacing[4] },
    signRow: { paddingVertical: theme.spacing[2], gap: theme.spacing[1.5] },
    signLabel: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
});
