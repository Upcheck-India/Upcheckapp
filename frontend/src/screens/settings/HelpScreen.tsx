import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';

interface HelpItem {
    icon: string;
    title: string;
    description: string;
}

const helpTopics: HelpItem[] = [
    {
        icon: 'water',
        title: 'Water Quality Monitoring',
        description: 'Record pH, DO, temperature, salinity and other parameters daily. Get alerts when values are outside optimal ranges.',
    },
    {
        icon: 'corn',
        title: 'Feed Management',
        description: 'Track feed usage, calculate daily feed amounts based on MBW, and monitor feeding efficiency (FCR).',
    },
    {
        icon: 'scale',
        title: 'Sampling Records',
        description: 'Regular sampling helps estimate biomass, survival rate, and average body weight (ABW/MBW).',
    },
    {
        icon: 'calculator-variant',
        title: 'Calculators',
        description: 'Use built-in calculators for FCR, feed amounts, product dosage, and free ammonia calculations.',
    },
    {
        icon: 'chart-timeline-variant',
        title: 'Simulations',
        description: 'Run growth simulations to predict harvest dates, expected yields, and optimize cultivation strategies.',
    },
    {
        icon: 'barn',
        title: 'Farm Management',
        description: 'Organize ponds, manage cycles, track inventory, and view financial reports per farm.',
    },
];

export const HelpScreen = ({ navigation }: any) => {
    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.introCard}>
                    <MaterialCommunityIcons name="help-circle" size={48} color={theme.roles.light.primary} />
                    <Text style={styles.introTitle}>How can we help?</Text>
                    <Text style={styles.introText}>
                        UpCheck is your shrimp aquaculture management companion. Here's how to get the most out of it.
                    </Text>
                </Card>

                <Text style={styles.sectionTitle}>Quick Guides</Text>
                {helpTopics.map((topic, index) => (
                    <Card key={index} style={styles.helpCard}>
                        <View style={styles.helpRow}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.roles.light.primary + '15' }]}>
                                <MaterialCommunityIcons name={topic.icon as any} size={24} color={theme.roles.light.primary} />
                            </View>
                            <View style={styles.helpContent}>
                                <Text style={styles.helpTitle}>{topic.title}</Text>
                                <Text style={styles.helpDescription}>{topic.description}</Text>
                            </View>
                        </View>
                    </Card>
                ))}

                <Text style={styles.sectionTitle}>Contact Us</Text>
                <Card style={styles.contactCard}>
                    <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:support@upcheck.in')}>
                        <MaterialCommunityIcons name="email" size={24} color={theme.roles.light.primary} />
                        <Text style={styles.contactText}>support@upcheck.in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('https://upcheck.in')}>
                        <MaterialCommunityIcons name="web" size={24} color={theme.roles.light.infoBorder} />
                        <Text style={styles.contactText}>upcheck.in</Text>
                    </TouchableOpacity>
                </Card>
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
        paddingBottom: theme.spacing[12],
    },
    introCard: {
        alignItems: 'center',
        padding: theme.spacing[6],
        marginBottom: theme.spacing[6],
    },
    introTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    introText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    helpCard: {
        marginBottom: theme.spacing[3],
        padding: theme.spacing[4],
    },
    helpRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[4],
    },
    helpContent: {
        flex: 1,
    },
    helpTitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
        marginBottom: theme.spacing[1],
    },
    helpDescription: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        lineHeight: 18,
    },
    contactCard: {
        padding: theme.spacing[4],
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    contactText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        marginLeft: theme.spacing[4],
    },
});