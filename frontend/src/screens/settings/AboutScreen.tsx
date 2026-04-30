import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';

export const AboutScreen = ({ navigation }: any) => {
    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>About UpCheck</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>🦐</Text>
                    <Text style={styles.appName}>UpCheck</Text>
                    <Text style={styles.tagline}>Shrimp Aquaculture Management</Text>
                </View>

                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Version</Text>
                    <Text style={styles.version}>v1.0.0</Text>
                    <Text style={styles.buildInfo}>Build 2026.04.30</Text>
                </Card>

                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>
                        UpCheck is a comprehensive shrimp aquaculture management application designed to help farmers monitor water quality, manage feed, track growth, and optimize cultivation practices.
                    </Text>
                </Card>

                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Features</Text>
                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Multi-farm management</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Pond monitoring & logs</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Water quality tracking</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Feed management</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Growth simulations</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.roles.light.successText} />
                            <Text style={styles.featureText}>Financial reports</Text>
                        </View>
                    </View>
                </Card>

                <Card style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>Developed By</Text>
                    <Text style={styles.developer}>UpCheck Team</Text>
                    <Text style={styles.location}>India</Text>
                </Card>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 UpCheck. All rights reserved.</Text>
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
        paddingBottom: theme.spacing[12],
    },
    logoContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing[8],
    },
    logo: {
        fontSize: 72,
        marginBottom: theme.spacing[3],
    },
    appName: {
        ...theme.typeScale.h1,
        color: theme.roles.light.primary,
        marginBottom: theme.spacing[2],
    },
    tagline: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    infoCard: {
        marginBottom: theme.spacing[4],
        padding: theme.spacing[4],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    version: {
        ...theme.typeScale.h3,
        color: theme.roles.light.primary,
        marginBottom: theme.spacing[1],
    },
    buildInfo: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    description: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        lineHeight: 22,
    },
    featureList: {
        gap: theme.spacing[2],
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    featureText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
    },
    developer: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    location: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    footer: {
        alignItems: 'center',
        marginTop: theme.spacing[6],
    },
    footerText: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textDisabled,
    },
});