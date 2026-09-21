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
 * The change list is legal text and English-only, so the recorded locale is
 * 'en' whatever the UI language.
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './ui/Button';
import { theme } from '../theme';
import { POLICY_CHANGES, PRIVACY_POLICY } from '../legal/content';

const c = theme.roles.light;

interface Props {
    visible: boolean;
    onContinue: (locale: string) => void;
}

export const PolicyUpdateSheet: React.FC<Props> = ({ visible, onContinue }) => {
    const { t, i18n } = useTranslation();
    const [full, setFull] = useState(false);
    const [busy, setBusy] = useState(false);
    const notEnglish = !(i18n.language || 'en').startsWith('en');

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => undefined}>
            <View style={styles.scrim}>
                <View style={styles.sheet} testID="policy-update-sheet">
                    <Text style={styles.title}>{t('consent.updateTitle')}</Text>
                    <Text style={styles.intro}>{t('consent.updateIntro')}</Text>
                    {notEnglish ? <Text style={styles.note}>{t('consent.englishOnly')}</Text> : null}
                    <ScrollView style={styles.scroll}>
                        {POLICY_CHANGES.map((line) => (
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
                            onContinue('en');
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
