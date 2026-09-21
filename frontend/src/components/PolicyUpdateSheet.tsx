/**
 * "What changed" sheet (spec C2.1) — shown once per LEGAL_VERSION to a
 * signed-in user who has not accepted that version on this device.
 *
 * Dismissible only by Continue (hardware back does nothing), but never a wall:
 * Continue works offline — the acceptance is stored on the device and the
 * consent rows queue until there is a connection. "Read the full policy"
 * expands it inline rather than navigating, so the sheet cannot be lost
 * behind another screen.
 *
 * The recorded locale is the language the legal text actually rendered in
 * ('en' for the change list; the notice's own fallback for the notice).
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './ui/Button';
import { theme } from '../theme';
import { POLICY_CHANGES, PRIVACY_POLICY } from '../legal/content';
import { dataNoticeFor } from '../legal/dataNotice';

const c = theme.roles.light;

interface Props {
    visible: boolean;
    /**
     * 'update' — an account that accepted an older version: what changed.
     * 'notice' — an account with no consent at all (created via a path that
     * skips DataNoticeScreen): the full short data notice.
     */
    variant: 'notice' | 'update';
    onContinue: (locale: string) => void;
}

export const PolicyUpdateSheet: React.FC<Props> = ({ visible, variant, onContinue }) => {
    const { t, i18n } = useTranslation();
    const [full, setFull] = useState(false);
    const [busy, setBusy] = useState(false);
    const notice = dataNoticeFor(i18n.language);
    // The update list is English-only; the notice may be translated one day.
    const shownLocale = variant === 'notice' ? notice.locale : 'en';
    const fellBack = shownLocale !== (i18n.language || 'en').split('-')[0];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => undefined}>
            <View style={styles.scrim}>
                <View style={styles.sheet} testID={`policy-sheet-${variant}`}>
                    <Text style={styles.title}>
                        {t(variant === 'notice' ? 'consent.noticeSheetTitle' : 'consent.updateTitle')}
                    </Text>
                    {variant === 'update' ? <Text style={styles.intro}>{t('consent.updateIntro')}</Text> : null}
                    {fellBack ? <Text style={styles.note}>{t('consent.englishOnly')}</Text> : null}
                    <ScrollView style={styles.scroll}>
                        {variant === 'notice'
                            ? notice.sections.map((s) => (
                                  <View key={s.heading} style={styles.block}>
                                      <Text style={styles.heading}>{s.heading}</Text>
                                      <Text style={styles.body}>{s.text}</Text>
                                  </View>
                              ))
                            : POLICY_CHANGES.map((line) => (
                                  <Text key={line} style={styles.bullet}>{`• ${line}`}</Text>
                              ))}
                        {full ? (
                            PRIVACY_POLICY.map((b, i) => (
                                <View key={i} style={styles.block}>
                                    {b.heading ? <Text style={styles.heading}>{b.heading}</Text> : null}
                                    <Text style={styles.body}>{b.text}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.link} accessibilityRole="link" onPress={() => setFull(true)}>
                                {t('consent.readFullPolicy')}
                            </Text>
                        )}
                    </ScrollView>
                    <Button
                        title={t('consent.updateContinue')}
                        loading={busy}
                        disabled={busy}
                        onPress={() => {
                            setBusy(true);
                            onContinue(shownLocale);
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        maxHeight: '85%',
        backgroundColor: c.background,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        padding: theme.spacing[5],
    },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    intro: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginTop: theme.spacing[2] },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[2], fontStyle: 'italic' },
    scroll: { marginVertical: theme.spacing[4] },
    bullet: { ...theme.typeScale.bodyMedium, color: c.textPrimary, marginBottom: theme.spacing[2] },
    block: { marginTop: theme.spacing[3] },
    heading: { ...theme.typeScale.labelLarge, color: c.textPrimary, marginBottom: theme.spacing[1] },
    body: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    link: { ...theme.typeScale.bodyMedium, color: c.textBrand, fontFamily: 'DMSans-SemiBold', marginTop: theme.spacing[2] },
});
