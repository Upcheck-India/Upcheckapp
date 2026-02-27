import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { theme } from '../../theme';

const calculators = [
    {
        id: 'performance',
        title: 'Cultivation Performance',
        description: 'Calculate FCR, ADG, Survival Rate, and Productivity',
        icon: 'chart-line',
        route: 'CultivationPerformance',
        color: theme.roles.light.primary,
    },
    {
        id: 'dailyFeed',
        title: 'Daily Feed Amount',
        description: 'Determine required feed based on MBW, SR and Feeding table',
        icon: 'corn',
        route: 'DailyFeedCalculator',
        color: theme.roles.light.warningText,
    },
    {
        id: 'productAmount',
        title: 'Product Dosage',
        description: 'Calculate product/chemical amount based on pond volume and ppm target',
        icon: 'flask-outline',
        route: 'ProductAmount',
        color: theme.roles.light.infoBorder,
    },
    {
        id: 'freeAmmonia',
        title: 'Free Ammonia (NH3)',
        description: 'Calculate toxic free ammonia from TAN, pH, Temp and Salinity',
        icon: 'alert-decagram',
        route: 'FreeAmmonia',
        color: theme.roles.light.dangerText,
    }
];

export const CalculatorHubScreen = ({ navigation }: any) => {
    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Tools & Calculators</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Select a calculator</Text>

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
