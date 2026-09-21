/**
 * The short data notice (spec C2.2) — shown in the sign-up flow between
 * IntentScreen and RegisterScreen, BEFORE any account exists.
 *
 * It creates nothing and signs nobody in. Continue remembers, on this device,
 * that the notice (this version, this language) was read, then hands the
 * intent on to Register exactly as IntentScreen used to. Once the account
 * exists, `settleLegalConsent` turns that into the terms + privacy consent
 * rows (source 'signup').
 *
 * The body is legal text and stays English until human translations arrive;
 * the screen says so when the farmer's language is not English.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { dataNoticeFor } from '../../legal/dataNotice';
import { acknowledgeDataNotice } from '../../features/consent';

const c = theme.roles.light;

export const DataNoticeScreen = ({ navigation, route }: any) => {
    const { t, i18n } = useTranslation();
    const notice = dataNoticeFor(i18n.language);
    const fellBack = notice.locale !== (i18n.language || 'en').split('-')[0];

    const onContinue = async () => {
        await acknowledgeDataNotice(notice.locale);
        navigation.navigate('Register', { intent: route?.params?.intent });
    };

    return (
        <ScreenWrapper scroll={false}>
            <ScrollView contentContainerStyle={styles.content} testID="data-notice">
                <Text style={styles.title}>{t('consent.noticeTitle')}</Text>
                <Text style={styles.intro}>{t('consent.noticeIntro')}</Text>
                {fellBack ? <Text style={styles.note}>{t('consent.englishOnly')}</Text> : null}
                {notice.sections.map((s) => (
                    <View key={s.heading} style={styles.section}>
                        <Text style={styles.heading}>{s.heading}</Text>
                        <Text style={styles.body}>{s.text}</Text>
                    </View>
                ))}
                <Text
                    style={styles.link}
                    accessibilityRole="link"
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                    {t('consent.readFullPolicy')}
                </Text>
            </ScrollView>
            <Button title={t('consent.noticeContinue')} onPress={onContinue} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: { paddingTop: theme.spacing[6], paddingBottom: theme.spacing[4] },
    title: { ...theme.typeScale.displaySmall, color: c.textPrimary },
    intro: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginTop: theme.spacing[2] },
    note: {
        ...theme.typeScale.bodySmall,
        color: c.textTertiary,
        marginTop: theme.spacing[3],
        fontStyle: 'italic',
    },
    section: { marginTop: theme.spacing[4] },
    heading: { ...theme.typeScale.labelLarge, color: c.textPrimary, marginBottom: theme.spacing[1] },
    body: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    link: {
        ...theme.typeScale.bodyMedium,
        color: c.textBrand,
        fontFamily: 'DMSans-SemiBold',
        marginTop: theme.spacing[5],
    },
});
