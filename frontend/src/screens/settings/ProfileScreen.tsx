import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { profilesApi, Profile, UpdateProfileDto } from '../../api/profiles';

export const ProfileScreen = ({ navigation }: any) => {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await profilesApi.getMine();
            setProfile(data);
            setFirstName(data.firstName || '');
            setLastName(data.lastName || '');
            setPhone(data.phone || '');
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updateData: UpdateProfileDto = {
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined,
                phone: phone.trim() || undefined,
            };

            const { data } = await profilesApi.update(user?.id || '', updateData);
            setProfile(data);
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFirstName(profile?.firstName || '');
        setLastName(profile?.lastName || '');
        setPhone(profile?.phone || '');
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    const displayName = isEditing
        ? `${firstName} ${lastName}`.trim() || user?.email?.split('@')[0] || 'User'
        : profile?.firstName && profile?.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : user?.name || user?.email?.split('@')[0] || 'User';

    return (
        <ScreenWrapper scroll={false} padded={false}>
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
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {isEditing ? (
                    <Card style={styles.editCard}>
                        <Text style={styles.editTitle}>Edit Profile</Text>

                        <Input
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter first name"
                        />

                        <Input
                            label="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter last name"
                        />

                        <Input
                            label="Phone"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                        />

                        <View style={styles.editButtons}>
                            <Button
                                title="Cancel"
                                onPress={handleCancel}
                                variant="outlined"
                                style={styles.cancelBtn}
                            />
                            <Button
                                title="Save"
                                onPress={handleSave}
                                loading={isSaving}
                                style={styles.saveBtn}
                            />
                        </View>
                    </Card>
                ) : (
                    <Card style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="email" size={20} color={theme.roles.light.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Email Address</Text>
                                <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="account" size={20} color={theme.roles.light.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                <Text style={styles.infoValue}>{displayName}</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="phone" size={20} color={theme.roles.light.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
                            </View>
                        </View>

                        <View style={[styles.infoRow, styles.noBorder]}>
                            <MaterialCommunityIcons name="calendar" size={20} color={theme.roles.light.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Member Since</Text>
                                <Text style={styles.infoValue}>
                                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                {!isEditing && (
                    <Button
                        title="Edit Profile"
                        onPress={() => setIsEditing(true)}
                        style={styles.editBtn}
                        icon="pencil"
                    />
                )}
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
    userEmail: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.surface + 'CC',
    },
    content: {
        padding: theme.spacing[4],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoCard: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[6],
        marginTop: -theme.spacing[4],
    },
    editCard: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[6],
        marginTop: -theme.spacing[4],
    },
    editTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
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
        flex: 1,
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
    editButtons: {
        flexDirection: 'row',
        gap: theme.spacing[4],
        marginTop: theme.spacing[4],
    },
    cancelBtn: {
        flex: 1,
    },
    saveBtn: {
        flex: 1,
    },
});