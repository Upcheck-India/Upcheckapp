import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { theme } from '../../theme';

export const CalculatorHubScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const calculators = [
        {
            id: 'performance',
            title: t('calculators.hub.performance.title'),
            description: t('calculators.hub.performance.description'),
            icon: 'chart-line',
            route: 'CultivationPerformance',
            color: theme.roles.light.primary,
        },
        {
            id: 'dailyFeed',
            title: t('calculators.hub.dailyFeed.title'),
            description: t('calculators.hub.dailyFeed.description'),
            icon: 'corn',
            route: 'DailyFeedCalculator',
            color: theme.roles.light.warningText,
        },
        {
            id: 'productAmount',
            title: t('calculators.hub.productAmount.title'),
            description: t('calculators.hub.productAmount.description'),
            icon: 'flask-outline',
            route: 'ProductAmount',
            color: theme.roles.light.infoBorder,
        },
        {
            id: 'freeAmmonia',
            title: t('calculators.hub.freeAmmonia.title'),
            description: t('calculators.hub.freeAmmonia.description'),
            icon: 'alert-decagram',
            route: 'FreeAmmonia',
            color: theme.roles.light.dangerText,
        },
        {
            id: 'growthHarvest',
            title: t('calculators.hub.growthHarvest.title'),
            description: t('calculators.hub.growthHarvest.description'),
            icon: 'shrimp',
            route: 'GrowthAndHarvest',
            color: theme.roles.light.successText,
        },
    ];

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('calculators.hub.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('calculators.hub.subtitle')}</Text>

                <View style={styles.grid}>
                    {calculators.map((calc) => (
                        <TouchableOpacity
                            key={calc.id}
                            style={styles.card}
                            onPress={() => navigation.navigate(calc.route)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: calc.color + '15' }]}>
                                <MaterialCommunityIcons name={calc.icon as any} size={32} color={calc.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{calc.title}</Text>
                                <Text style={styles.cardDesc}>{calc.description}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.roles.light.textDisabled} />
                        </TouchableOpacity>
                    ))}
                </View>
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
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
    },
    grid: {
        gap: theme.spacing[4],
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.roles.light.surface,
        padding: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[4],
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: 4,
    },
    cardDesc: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
});
