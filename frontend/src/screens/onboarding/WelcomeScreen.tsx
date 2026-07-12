/**
 * WelcomeScreen — the first-run experience for a brand-new farmer (zero farms).
 * A non-blocking, single-screen welcome: brand mark, three plain-language value
 * props, and one clear CTA into farm creation. Shown once (gated by an
 * AsyncStorage flag set here), triggered from the dashboard when the user has no
 * farms yet. Deliberately a single screen (no swiper) for robustness.
 *
 * Language selection is the FIRST interactive element on this screen — above
 * the value-prop copy, not a small corner chip — because a brand-new farmer
 * previously had no way to pick their language before reading three feature
 * sentences in whatever the device locale resolved to (the single biggest
 * first-impression gap found in docs/UI_UX_AUDIT.md / docs/ONBOARDING_MODULE_PLAN.md
 * Phase 1). Selecting a language re-renders this screen's own copy immediately,
 * so the farmer sees the effect of their choice before doing anything else.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { ShrimpLogo } from '../../components/ui/ShrimpLogo';
import { theme } from '../../theme';
import i18n from '../../i18n';
import { LANGUAGES } from '../../i18n/languages';

export const ONBOARDING_FLAG = '@upcheck:onboarded';

const FEATURES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; key: string; tint: string }[] = [
    { icon: 'water-check', key: 'home.onboarding_feature1', tint: '#2196F3' },
    { icon: 'chart-line', key: 'home.onboarding_feature2', tint: '#0B8457' },
    { icon: 'account-group', key: 'home.onboarding_feature3', tint: '#7C4DFF' },
];

export const WelcomeScreen = ({ navigation }: any) => {
    const { t, i18n: i18nInstance } = useTranslation();
    const [langExpanded, setLangExpanded] = useState(false);

    const finish = async (next: 'create' | 'skip') => {
        try {
            await AsyncStorage.setItem(ONBOARDING_FLAG, '1');
        } catch {
            /* best-effort; the flag only suppresses a repeat welcome */
        }
        if (next === 'create') {
            navigation.replace('CreateFarm');
        } else {
            navigation.goBack();
        }
    };

    return (
        <ScreenWrapper>
            {/* Language selection — the first interactive element on this screen,
                deliberately above everything else including the logo. */}
            <View style={styles.langSection}>
                <Text style={styles.langPrompt}>{t('home.onboarding_languagePrompt', 'Choose your language')}</Text>
                <View style={styles.langGrid}>
                    {(langExpanded ? LANGUAGES : LANGUAGES.slice(0, 3)).map((lang) => {
                        const active = lang.code === i18nInstance.language;
                        return (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.langChip, active && styles.langChipActive]}
                                onPress={() => i18n.changeLanguage(lang.code)}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={`${lang.label} (${lang.nativeLabel})`}
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.langChipNative, active && styles.langChipTextActive]}>{lang.nativeLabel}</Text>
                                <Text style={[styles.langChipGloss, active && styles.langChipGlossActive]}>{lang.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {!langExpanded && LANGUAGES.length > 3 && (
                        <TouchableOpacity
                            style={styles.langMoreChip}
                            onPress={() => setLangExpanded(true)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.more', 'More')}
                        >
                            <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.roles.light.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.hero}>
                <LinearGradient
                    colors={theme.gradients.brand.colors as [string, string, ...string[]]}
                    start={theme.gradients.brand.start}
                    end={theme.gradients.brand.end}
                    style={styles.logoCircle}
                >
                    <ShrimpLogo size={56} color={theme.roles.light.textInverse} eyeColor={theme.roles.light.primary} />
                </LinearGradient>
                <Text style={styles.title}>{t('home.onboarding_title')}</Text>
                <Text style={styles.subtitle}>{t('home.onboarding_subtitle')}</Text>
            </View>

            <View style={styles.features}>
                {FEATURES.map((f) => (
                    <View key={f.key} style={styles.featureRow}>
                        <View style={[styles.featureIcon, { backgroundColor: f.tint + '1A' }]}>
                            <MaterialCommunityIcons name={f.icon} size={24} color={f.tint} />
                        </View>
                        <Text style={styles.featureText}>{t(f.key)}</Text>
                    </View>
                ))}
            </View>

            {/* Static, illustrative preview — a contained version of the
                "show value before commit" idea (Concept D in
                docs/ONBOARDING_MODULE_PLAN.md Phase 3). Deliberately NOT a real
                demo-data seeding path (no API calls, no rows created anywhere) —
                that fuller version needs a product-owner decision on the
                engineering cost of a safe, clearly-labeled demo flow, per the
                plan doc. This is a zero-risk static mockup instead, clearly
                labeled "Example" so it can never be mistaken for real data. */}
            <View style={styles.exampleCard}>
                <View style={styles.exampleBadgeRow}>
                    <MaterialCommunityIcons name="eye-outline" size={14} color={theme.roles.light.textTertiary} />
                    <Text style={styles.exampleBadge}>{t('home.onboarding_exampleLabel', 'EXAMPLE — not your data')}</Text>
                </View>
                <View style={styles.exampleStatsRow}>
                    <View style={styles.exampleStat}>
                        <Text style={styles.exampleStatValue}>45</Text>
                        <Text style={styles.exampleStatLabel}>{t('home.onboarding_exampleDoc', 'Days')}</Text>
                    </View>
                    <View style={styles.exampleStat}>
                        <Text style={styles.exampleStatValue}>1.2</Text>
                        <Text style={styles.exampleStatLabel}>{t('home.onboarding_exampleFcr', 'FCR')}</Text>
                    </View>
                    <View style={styles.exampleStat}>
                        <Text style={styles.exampleStatValue}>92%</Text>
                        <Text style={styles.exampleStatLabel}>{t('home.onboarding_exampleSurvival', 'Survival')}</Text>
                    </View>
                </View>
                <Text style={styles.exampleCaption}>
                    {t('home.onboarding_exampleCaption', "This is what a pond's dashboard looks like once you start logging — your own numbers will appear here.")}
                </Text>
            </View>

            <View style={styles.actions}>
                <Button title={t('home.onboarding_cta')} onPress={() => finish('create')} style={styles.cta} />
                <Button title={t('home.onboarding_skip')} variant="text" onPress={() => finish('skip')} />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    langSection: {
        paddingTop: theme.spacing[2],
    },
    langPrompt: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing[3],
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: theme.spacing[2],
    },
    langChip: {
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: theme.roles.light.borderDefault,
        alignItems: 'center',
        minWidth: 84,
    },
    langChipActive: {
        borderColor: theme.roles.light.primary,
        backgroundColor: theme.roles.light.surfaceOverlay,
    },
    langChipNative: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    langChipGloss: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textTertiary,
        marginTop: 2,
    },
    langChipTextActive: { color: theme.roles.light.primary },
    langChipGlossActive: { color: theme.roles.light.primary },
    langMoreChip: {
        width: 44,
        height: 44,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: theme.roles.light.borderDefault,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        alignItems: 'center',
        paddingTop: theme.spacing[6],
        paddingBottom: theme.spacing[8],
    },
    logoCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing[6],
        ...theme.shadows.brandGlow,
    },
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing[2],
    },
    features: {
        flex: 1,
        gap: theme.spacing[4],
        paddingHorizontal: theme.spacing[2],
        justifyContent: 'center',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[4],
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
    },
    exampleCard: {
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.roles.light.borderDefault,
        padding: theme.spacing[4],
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    exampleBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        justifyContent: 'center',
        marginBottom: theme.spacing[3],
    },
    exampleBadge: {
        ...theme.typeScale.overline,
        color: theme.roles.light.textTertiary,
    },
    exampleStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing[3],
    },
    exampleStat: { alignItems: 'center' },
    exampleStatValue: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textSecondary,
    },
    exampleStatLabel: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textTertiary,
    },
    exampleCaption: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    actions: {
        gap: theme.spacing[2],
        paddingBottom: theme.spacing[4],
    },
    cta: {
        alignSelf: 'stretch',
    },
});

export default WelcomeScreen;
