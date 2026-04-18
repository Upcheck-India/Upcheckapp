import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export const ProfileScreen = ({ navigation }: any) => {
    const { user } = useAuthStore();

    const userProfile = {
        name: user?.name || user?.email?.split('@')[0] || 'Unknown User',
        email: user?.email || 'N/A',
        role: (user as any)?.role || 'Farm Manager',
        joinedAt: (user as any)?.createdAt || new Date().toISOString(),
        farmsManaged: 0, // Placeholder or fetch from api
    };

    return (
        <ScreenWrapper>
            <View style={styles.headerBackground}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <MaterialCommunityIcons name="cog" size={24} color={theme.roles.light.surface} />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileInfoContainer}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="account" size={48} color={theme.roles.light.primary} />
                    </View>
                    <Text style={styles.userName}>{userProfile.name}</Text>
                    <Text style={styles.userRole}>{userProfile.role}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="email" size={20} color={theme.roles.light.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoValue}>{userProfile.email}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={20} color={theme.roles.light.textSecondary} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Member Since</Text>
                            <Text style={styles.infoValue}>{new Date(userProfile.joinedAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, styles.noBorder]}>
                        <MaterialCommunityIcons name="water" size={20} color={theme.roles.light.textSecondary} />
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
        backgroundColor: theme.roles.light.primary,
        paddingTop: theme.spacing[12],
        paddingBottom: theme.spacing[8],
        borderBottomLeftRadius: theme.radius.xl,
        borderBottomRightRadius: theme.radius.xl,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.surface,
    },
    profileInfoContainer: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.roles.light.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    userName: {
        ...theme.typeScale.h2,
        color: theme.roles.light.surface,
        marginBottom: 4,
    },
    userRole: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.surface + 'CC', // 80% opacity
    },
    content: {
        padding: theme.spacing[4],
    },
    infoCard: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[6],
        marginTop: -theme.spacing[4], // Overlap the header slightly
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    noBorder: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    infoTextContainer: {
        marginLeft: theme.spacing[4],
    },
    infoLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    editBtn: {
        marginTop: theme.spacing[4],
    },
});
