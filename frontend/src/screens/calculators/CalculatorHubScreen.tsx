import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Colors, typography, spacing, radius } from '../../theme';

const calculators = [
    {
        id: 'performance',
        title: 'Cultivation Performance',
        description: 'Calculate FCR, ADG, Survival Rate, and Productivity',
        icon: 'chart-line',
        route: 'CultivationPerformance',
        color: Colors.primary,
    },
    {
        id: 'dailyFeed',
        title: 'Daily Feed Amount',
        description: 'Determine required feed based on MBW, SR and Feeding table',
        icon: 'corn',
        route: 'DailyFeedCalculator',
        color: Colors.warning,
    },
    {
        id: 'productAmount',
        title: 'Product Dosage',
        description: 'Calculate product/chemical amount based on pond volume and ppm target',
        icon: 'flask-outline',
        route: 'ProductAmount',
        color: Colors.info,
    },
    {
        id: 'freeAmmonia',
        title: 'Free Ammonia (NH3)',
        description: 'Calculate toxic free ammonia from TAN, pH, Temp and Salinity',
        icon: 'alert-decagram',
        route: 'FreeAmmonia',
        color: Colors.error,
    }
];

export const CalculatorHubScreen = ({ navigation }: any) => {
    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
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
                            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textDisabled} />
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
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    backBtn: {
        padding: spacing.md,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    content: {
        padding: spacing.md,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        marginBottom: spacing.md,
    },
    grid: {
        gap: spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        ...typography.h5,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    cardDesc: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
    },
});
