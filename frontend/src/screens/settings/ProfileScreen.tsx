import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';

export const ProfileScreen = ({ navigation }: any) => {
    // Mock user profile data
    const userProfile = {
        name: 'John Doe',
        email: 'john.doe@shrimpfarm.com',
        role: 'Farm Manager',
        joinedAt: '2025-01-15T00:00:00Z',
        farmsManaged: 2,
    };

    return (
        <ScreenWrapper>
            <View style={styles.headerBackground}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <MaterialCommunityIcons name="cog" size={24} color={Colors.surface} />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileInfoContainer}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="account" size={48} color={Colors.primary} />
                    </View>
                    <Text style={styles.userName}>{userProfile.name}</Text>
                    <Text style={styles.userRole}>{userProfile.role}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="email" size={20} color={Colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoValue}>{userProfile.email}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={20} color={Colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Member Since</Text>
                            <Text style={styles.infoValue}>{new Date(userProfile.joinedAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, styles.noBorder]}>
                        <MaterialCommunityIcons name="water" size={20} color={Colors.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Farms Managed</Text>
                            <Text style={styles.infoValue}>{userProfile.farmsManaged}</Text>
                        </View>
                    </View>
                </Card>

                <Button
                    title="Edit Profile"
                    onPress={() => { }} // Placeholder for edit form
                    style={styles.editBtn}
                    icon="pencil"
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerBackground: {
        backgroundColor: Colors.primary,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    headerTitle: {
        ...typography.h3,
        color: Colors.surface,
    },
    profileInfoContainer: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    userName: {
        ...typography.h2,
        color: Colors.surface,
        marginBottom: 4,
    },
    userRole: {
        ...typography.bodyMedium,
        color: Colors.surface + 'CC', // 80% opacity
    },
    content: {
        padding: spacing.md,
    },
    infoCard: {
        padding: spacing.md,
        marginBottom: spacing.lg,
        marginTop: -spacing.md, // Overlap the header slightly
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    noBorder: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    infoTextContainer: {
        marginLeft: spacing.md,
    },
    infoLabel: {
        ...typography.labelSmall,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        ...typography.bodyLarge,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    editBtn: {
        marginTop: spacing.md,
    },
});
