import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator, Divider, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ProfileService } from '../../services/profileService';
import { Profile } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { GradientButton } from '../../components/GradientButton';

const SecurityRow = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
    <TouchableOpacity
        style={secStyles.securityRow}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.7}
    >
        <View style={secStyles.securityRowLeft}>
            <View style={secStyles.securityIconCircle}>
                <MaterialCommunityIcons name={icon as any} size={20} color={Colors.primary} />
            </View>
            <Text style={secStyles.securityRowTitle}>{title}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.grey} />
    </TouchableOpacity>
);

const secStyles = StyleSheet.create({
    securityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    securityRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    securityIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Layout.spacing.md,
    },
    securityRowTitle: {
        fontSize: 15,
        color: Colors.text,
    },
});

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'Tamil' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ms', label: 'Malay' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'id', label: 'Indonesian' },
];

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const { user, logout, isOAuthUser, deleteAccount } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Edit form state
    const [fullName, setFullName] = useState('');
    const [website, setWebsite] = useState('');
    const [username, setUsername] = useState('');
    const [selectedLang, setSelectedLang] = useState('en');

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [user])
    );

    const loadProfile = async () => {
        setLoading(true);
        try {
            if (user) {
                const data = await ProfileService.getProfile(user.id);
                setProfile(data);
                if (data) {
                    setFullName(data.fullName || '');
                    setWebsite(data.website || '');
                    setUsername(data.username || '');
                    setSelectedLang(data.languagePreference || 'en');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!profile) return;
        try {
            await ProfileService.updateProfile(profile.id, { fullName, website, username, avatarUrl: profile.avatarUrl });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditModalVisible(false);
            loadProfile();
            Alert.alert('Success', 'Profile updated');
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleSaveLanguage = async () => {
        if (!profile) return;
        try {
            await ProfileService.updateProfile(profile.id, { languagePreference: selectedLang } as any);
            setProfile(prev => prev ? { ...prev, languagePreference: selectedLang } : null);
            setLangModalVisible(false);
            Alert.alert('Saved', `Language set to ${LANGUAGES.find(l => l.code === selectedLang)?.label}`);
        } catch {
            Alert.alert('Error', 'Failed to save language');
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    setSigningOut(true);
                    try { await logout(); } catch { /* onAuthStateChange handles navigation */ }
                    finally { setSigningOut(false); }
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and ALL your data (farms, ponds, cycles, records). This action CANNOT be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever', style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Are you absolutely sure?',
                            'Type your email to confirm: ' + (user?.email ?? ''),
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Delete Everything', style: 'destructive',
                                    onPress: async () => {
                                        setDeleting(true);
                                        try {
                                            await deleteAccount();
                                        } catch (e: any) {
                                            Alert.alert('Error', e.message ?? 'Failed to delete account');
                                        } finally {
                                            setDeleting(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    // Prompt OAuth users to set a username on first load
    const needsProfileCompletion = isOAuthUser && profile && !profile.username;

    const displayName = profile?.fullName || user?.firstName || user?.username || 'User';
    const displayEmail = profile?.email || user?.email || '';
    const avatarLabel = displayName.substring(0, 2).toUpperCase();
    const langLabel = LANGUAGES.find(l => l.code === (profile?.languagePreference || 'en'))?.label ?? 'English';

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile completion banner for OAuth users */}
                {needsProfileCompletion && (
                    <TouchableOpacity style={styles.completionBanner} onPress={() => setEditModalVisible(true)} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fff" />
                        <Text style={styles.completionText}>Complete your profile — tap to set a username</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* Gradient Header */}
                <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                    <Avatar.Text size={80} label={avatarLabel} style={styles.avatar} />
                    <Text variant="headlineSmall" style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{displayEmail}</Text>
                    {isOAuthUser && (
                        <View style={styles.oauthBadge}>
                            <MaterialCommunityIcons name="google" size={12} color="#fff" />
                            <Text style={styles.oauthBadgeText}>Google Account</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.editBadge} onPress={() => setEditModalVisible(true)}>
                        <MaterialCommunityIcons name="pencil" size={14} color={Colors.textLight} />
                        <Text style={styles.editBadgeText}>Edit</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Info Card */}
                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <InfoRow icon="at" label="Username" value={profile?.username || 'Not set'} />
                            <Divider style={styles.divider} />
                            <InfoRow icon="web" label="Website" value={profile?.website || 'Not set'} />
                            <Divider style={styles.divider} />
                            <TouchableOpacity onPress={() => setLangModalVisible(true)}>
                                <InfoRow icon="translate" label="Language" value={langLabel} actionIcon="chevron-right" />
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>

                    {/* Security Card */}
                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <Text variant="titleSmall" style={styles.sectionLabel}>Security & Login</Text>
                            <SecurityRow icon="tools" title="Settings" onPress={() => navigation.navigate('Settings')} />
                            {!isOAuthUser && (
                                <SecurityRow icon="lock-outline" title="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
                            )}
                            <SecurityRow icon="shield-lock-outline" title="Two-Factor Authentication" onPress={() => navigation.navigate('TwoFASetup')} />
                            <SecurityRow icon="cellphone-link" title="Active Sessions" onPress={() => navigation.navigate('SessionManagement')} />
                        </Card.Content>
                    </Card>

                    {/* Sign Out */}
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
                        <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
                    </TouchableOpacity>

                    {/* Delete Account */}
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="delete-forever-outline" size={20} color={Colors.error} />
                        <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete Account'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Portal>
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Edit Profile</Text>
                    <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Username" value={username} onChangeText={setUsername} mode="outlined" style={styles.input} autoCapitalize="none" left={<TextInput.Icon icon="at" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <TextInput label="Website" value={website} onChangeText={setWebsite} mode="outlined" style={styles.input} autoCapitalize="none" inputMode="url" left={<TextInput.Icon icon="web" />} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                    <GradientButton title="Save Changes" onPress={handleUpdate} icon="content-save" style={{ marginTop: Layout.spacing.sm }} />
                    <Button mode="text" onPress={() => setEditModalVisible(false)} style={{ marginTop: Layout.spacing.sm }}>Cancel</Button>
                </Modal>
            </Portal>

            {/* Language Modal */}
            <Portal>
                <Modal visible={langModalVisible} onDismiss={() => setLangModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Select Language</Text>
                    <RadioButton.Group onValueChange={setSelectedLang} value={selectedLang}>
                        {LANGUAGES.map(l => (
                            <TouchableOpacity key={l.code} style={styles.langRow} onPress={() => setSelectedLang(l.code)}>
                                <RadioButton value={l.code} />
                                <Text style={styles.langLabel}>{l.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </RadioButton.Group>
                    <GradientButton title="Save" onPress={handleSaveLanguage} icon="check" style={{ marginTop: Layout.spacing.md }} />
                    <Button mode="text" onPress={() => setLangModalVisible(false)} style={{ marginTop: Layout.spacing.sm }}>Cancel</Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const InfoRow = ({ icon, label, value, actionIcon }: { icon: string; label: string; value: string; actionIcon?: string }) => (
    <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name={icon as any} size={18} color={Colors.textTertiary} style={{ marginRight: Layout.spacing.md }} />
            <View>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </View>
        {actionIcon && <MaterialCommunityIcons name={actionIcon as any} size={18} color={Colors.grey} />}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1 },
    header: {
        alignItems: 'center',
        paddingTop: Layout.spacing.xxl,
        paddingBottom: Layout.spacing.xxl,
        borderBottomLeftRadius: Layout.headerBorderRadius,
        borderBottomRightRadius: Layout.headerBorderRadius,
    },
    avatar: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    name: { marginTop: Layout.spacing.md, fontWeight: 'bold', color: Colors.textLight },
    email: { color: 'rgba(255,255,255,0.85)', marginTop: Layout.spacing.xs },
    editBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.xs,
        borderRadius: Layout.radius.full,
        marginTop: Layout.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editBadgeText: { color: Colors.textLight, fontSize: 12, fontWeight: '600', marginLeft: 4 },
    content: { padding: Layout.spacing.lg },
    infoCard: {
        marginBottom: Layout.spacing.lg,
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.radius.lg,
    },
    sectionLabel: {
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Layout.spacing.sm,
        textTransform: 'uppercase',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Layout.spacing.sm,
    },
    label: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    value: { fontSize: 15, color: Colors.text, marginTop: 2 },
    divider: { marginVertical: Layout.spacing.sm },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.lg,
        borderRadius: Layout.radius.md,
        borderWidth: 1,
        borderColor: Colors.error,
        marginTop: Layout.spacing.sm,
    },
    signOutText: { color: Colors.error, fontWeight: '600', marginLeft: Layout.spacing.sm },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.md,
        borderRadius: Layout.radius.md,
        marginTop: Layout.spacing.sm,
        marginBottom: Layout.spacing.xxl,
    },
    deleteText: { color: Colors.textTertiary, fontSize: 13, marginLeft: Layout.spacing.sm },
    oauthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: Layout.radius.full,
        marginTop: Layout.spacing.sm,
    },
    oauthBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 4 },
    completionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning,
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.md,
        gap: 8,
    },
    completionText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
    langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Layout.spacing.sm },
    langLabel: { fontSize: 15, color: Colors.text, marginLeft: 4 },
    modalContent: {
        backgroundColor: Colors.modalBackground,
        padding: Layout.modalPadding,
        margin: Layout.modalMargin,
        borderRadius: Layout.modalRadius,
    },
    modalTitle: { marginBottom: Layout.spacing.lg, textAlign: 'center', color: Colors.text, fontWeight: '600' },
    input: { marginBottom: Layout.spacing.md, backgroundColor: Colors.surface },
});

export default ProfileScreen;
