/**
 * Settings → Privacy → "Help improve Neerani's advice" (compliance C3).
 *
 * Two separate switches — farm records, photos — both OFF unless the farmer
 * turns them on. Every flip appends a consent row (a switch-off is a
 * withdrawal row, never an edit). Nothing in the app trains a model; this
 * records the permission a future dataset build must filter on
 * (backend ConsentsService.usersWithCurrentTrainingConsent).
 *
 * The paragraph is legal text, English until a human translation exists.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { mlTrainingNoticeFor } from '../../legal/dataNotice';
import {
    DEFAULT_TRAINING_PREFS,
    loadTrainingPrefs,
    refreshTrainingPrefs,
    setTrainingConsent,
    type TrainingPrefs,
    type TrainingScope,
} from '../../features/consent';

const c = theme.roles.light;

export const ImproveAdviceScreen = ({ navigation }: any) => {
    const { t, i18n } = useTranslation();
    const userId = useAuthStore((s) => s.user?.id);
    const [prefs, setPrefs] = useState<TrainingPrefs>(DEFAULT_TRAINING_PREFS);
    const notice = mlTrainingNoticeFor(i18n.language);
    const fellBack = notice.locale !== (i18n.language || 'en').split('-')[0];

    useEffect(() => {
        if (!userId) return;
        let live = true;
        // Device copy first (instant, offline), then the server's latest row.
        loadTrainingPrefs(userId)
            .then((p) => {
                if (live) setPrefs(p);
                return refreshTrainingPrefs(userId);
            })
            .then((p) => {
                if (live && p) setPrefs(p);
            });
        return () => {
            live = false;
        };
    }, [userId]);

    const flip = (scope: TrainingScope, granted: boolean) => {
        if (!userId) return;
        setPrefs((p) => ({ ...p, [scope]: granted }));
        void setTrainingConsent(userId, scope, granted, notice.locale);
    };

    const row = (scope: TrainingScope, label: string) => (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Switch
                testID={`ml-toggle-${scope}`}
                value={prefs[scope]}
                onValueChange={(v) => flip(scope, v)}
                trackColor={{ false: c.borderDefault, true: c.primaryHover }}
            />
        </View>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <ScreenHeader title={t('consent.improveTitle')} onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.body}>{notice.text}</Text>
                {fellBack ? <Text style={styles.note}>{t('consent.englishOnly')}</Text> : null}
                {row('records', t('consent.mlRecords'))}
                {row('photos', t('consent.mlPhotos'))}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: { padding: theme.spacing[5], gap: theme.spacing[3] },
    body: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, fontStyle: 'italic' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[2.5],
        borderTopWidth: 1,
        borderTopColor: c.borderDefault,
    },
    rowLabel: { ...theme.typeScale.labelLarge, flex: 1, color: c.textPrimary },
});
