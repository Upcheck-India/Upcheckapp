/**
 * WelcomeScreen — the first-run experience for a brand-new farmer (zero farms).
 * A non-blocking, single-screen welcome: brand mark, three plain-language value
 * props, and one clear CTA into farm creation. Shown once (gated by an
 * AsyncStorage flag set here), triggered from the dashboard when the user has no
 * farms yet. Deliberately a single screen (no swiper) for robustness.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { ShrimpLogo } from '../../components/ui/ShrimpLogo';
import { theme } from '../../theme';

export const ONBOARDING_FLAG = '@upcheck:onboarded';

const FEATURES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; key: string; tint: string }[] = [
    { icon: 'water-check', key: 'home.onboarding_feature1', tint: '#2196F3' },
    { icon: 'chart-line', key: 'home.onboarding_feature2', tint: '#0B8457' },
    { icon: 'account-group', key: 'home.onboarding_feature3', tint: '#7C4DFF' },
];

export const WelcomeScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

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

            <View style={styles.actions}>
                <Button title={t('home.onboarding_cta')} onPress={() => finish('create')} style={styles.cta} />
                <Button title={t('home.onboarding_skip')} variant="text" onPress={() => finish('skip')} />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    hero: {
        alignItems: 'center',
        paddingTop: theme.spacing[10],
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
    actions: {
        gap: theme.spacing[2],
        paddingBottom: theme.spacing[4],
    },
    cta: {
        alignSelf: 'stretch',
    },
});

export default WelcomeScreen;
