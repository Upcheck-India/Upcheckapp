import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput as RNTextInput, Share } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator, Divider, RadioButton, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ProfileService } from '../../services/profileService';
import { supabase } from '../../services/supabase';
import { apiClient } from '../../services/apiClient';
import { Profile } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { GradientButton } from '../../components/GradientButton';

const SecurityRow = ({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle?: string; onPress: () => void }) => (
    <TouchableOpacity style={secStyles.securityRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} activeOpacity={0.7}>
        <View style={secStyles.securityRowLeft}>
            <View style={secStyles.securityIconCircle}>
                <MaterialCommunityIcons name={icon as any} size={20} color={Colors.primary} />
            </View>
            <View>
                <Text style={secStyles.securityRowTitle}>{title}</Text>
                {subtitle ? <Text style={secStyles.securityRowSub}>{subtitle}</Text> : null}
            </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.grey} />
    </TouchableOpacity>
);

const secStyles = StyleSheet.create({
    securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Layout.spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    securityRowLeft: { flexDirection: 'row', alignItems: 'center' },
    securityIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: Layout.spacing.md },
    securityRowTitle: { fontSize: 15, color: Colors.text },
    securityRowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
});

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'Tamil' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ms', label: 'Malay' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'id', label: 'Indonesian' },
];

type EditingField = 'fullName' | 'username' | 'website' | 'bio' | null;
type EmailChangeStep = 'idle' | 'form' | 'sent';

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const { user, logout, isOAuthUser, changeEmail } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<EditingField>(null);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Field edit values
    const [editValue, setEditValue] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [selectedLang, setSelectedLang] = useState('en');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Email change modal
    const [emailStep, setEmailStep] = useState<EmailChangeStep>('idle');
    const [newEmailInput, setNewEmailInput] = useState('');
    const [emailChangeError, setEmailChangeError] = useState('');
    const [emailChanging, setEmailChanging] = useState(false);

    useFocusEffect(useCallback(() => { loadProfile(); }, [user]));

    const loadProfile = async () => {
        setLoading(true);
        try {
            if (user) {
                const data = await ProfileService.getProfile(user.id);
                setProfile(data);
                if (data) setSelectedLang(data.languagePreference || 'en');
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const startEdit = (field: EditingField, current: string) => {
        setEditingField(field); setEditValue(current); setUsernameStatus('idle');
    };
    const cancelEdit = () => { setEditingField(null); setEditValue(''); setUsernameStatus('idle'); };

    const handleUsernameChange = (v: string) => {
        const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setEditValue(clean);
        setUsernameStatus('idle');
        if (clean.length < 3) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setUsernameStatus('checking');
            try {
                const r = await apiClient.get(`/profiles/check-username/${clean}`) as any;
                setUsernameStatus(r?.available ? 'available' : 'taken');
            } catch { setUsernameStatus('idle'); }
        }, 800);
    };

    const saveField = async (field: EditingField) => {
        if (!profile || !field) return;
        if (field === 'username' && usernameStatus === 'taken') { Alert.alert('Username taken', 'Choose a different username.'); return; }
        if (field === 'username' && editValue.length < 3) { Alert.alert('Too short', 'Minimum 3 characters.'); return; }
        if (field === 'username' && usernameStatus === 'checking') { Alert.alert('Please wait', 'Still checking username availability…'); return; }
        setSavingField(field);
        try {
            await ProfileService.updateProfile(profile.id, { [field]: editValue } as any);
            setProfile(prev => prev ? { ...prev, [field]: editValue } : null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            cancelEdit();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to save. Try again.');
        } finally { setSavingField(null); }
    };

    const handleAvatarUpload = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission required', 'Allow photo access to upload an avatar.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (result.canceled || !result.assets[0]) return;
        setAvatarUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) throw new Error('Not authenticated');
            const asset = result.assets[0];
            const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const path = `avatars/${session.user.id}.${ext}`;
            // Fetch the local file as a Blob (correct way for Supabase RN storage)
            const fileResponse = await fetch(asset.uri);
            const blob = await fileResponse.blob();
            const { error } = await supabase.storage.from('avatars').upload(path, blob, {
                contentType: mimeType,
                upsert: true,
            });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
            await ProfileService.updateProfile(session.user.id, { avatarUrl: urlData.publicUrl });
            setProfile(prev => prev ? { ...prev, avatarUrl: urlData.publicUrl } : null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) { Alert.alert('Upload failed', e.message ?? 'Could not upload image'); }
        finally { setAvatarUploading(false); }
    };

    const handleShareProfile = async () => {
        const username = profile?.username || user?.username;
        if (!username) { Alert.alert('No username', 'Set a username first to share your profile.'); return; }
        const url = `upcheckapp://profile/${username}`;
        await Share.share({
            message: `Check out my profile on Upcheck!\n${url}`,
            title: 'My Upcheck Profile',
        });
    };

    const handleEmailChangeSubmit = async () => {
        if (!newEmailInput.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmailInput.trim())) {
            setEmailChangeError('Please enter a valid email address.');
            return;
        }
        setEmailChanging(true);
        setEmailChangeError('');
        try {
            await changeEmail(newEmailInput.trim());
            setEmailStep('sent');
        } catch (e: any) {
            setEmailChangeError(e.message ?? 'Failed to request email change.');
        } finally {
            setEmailChanging(false);
        }
    };

    const handleSaveLanguage = async () => {
        if (!profile) return;
        try {
            await ProfileService.updateProfile(profile.id, { languagePreference: selectedLang } as any);
            setProfile(prev => prev ? { ...prev, languagePreference: selectedLang } : null);
            setLangModalVisible(false);
        } catch { Alert.alert('Error', 'Failed to save language'); }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { setSigningOut(true); try { await logout(); } finally { setSigningOut(false); } } },
        ]);
    };

    const displayName = profile?.fullName || user?.firstName || user?.username || 'User';
    const displayEmail = profile?.email || user?.email || '';
    const avatarLabel = displayName.substring(0, 2).toUpperCase();
    const langLabel = LANGUAGES.find(l => l.code === (profile?.languagePreference || 'en'))?.label ?? 'English';

    const EditableRow = ({ field, icon, label, value, placeholder }: { field: EditingField; icon: string; label: string; value: string; placeholder: string }) => {
        const isEditing = editingField === field;
        const isSaving = savingField === field;
        return (
            <View style={styles.editableRow}>
                <View style={styles.editableRowHeader}>
                    <View style={styles.editableRowLeft}>
                        <MaterialCommunityIcons name={icon as any} size={16} color={Colors.textTertiary} />
                        <Text style={styles.fieldLabel}>{label}</Text>
                    </View>
                    {!isEditing && <TouchableOpacity onPress={() => startEdit(field, value)} style={styles.pencilBtn}>
                        <MaterialCommunityIcons name="pencil-outline" size={15} color={Colors.primary} />
                    </TouchableOpacity>}
                </View>
                {isEditing ? (
                    <View style={{ marginTop: 4 }}>
                        <TextInput value={editValue} onChangeText={field === 'username' ? handleUsernameChange : setEditValue} mode="outlined" autoCapitalize={field === 'username' ? 'none' : 'sentences'} style={styles.inlineInput} outlineColor={Colors.border} activeOutlineColor={Colors.primary} autoFocus
                            right={field === 'username' ? (usernameStatus === 'checking' ? <TextInput.Icon icon="loading" /> : usernameStatus === 'available' ? <TextInput.Icon icon="check-circle" color={Colors.success} /> : usernameStatus === 'taken' ? <TextInput.Icon icon="close-circle" color={Colors.error} /> : undefined) : undefined}
                        />
                        {field === 'username' && usernameStatus === 'taken' && <Text style={styles.usernameError}>Already taken</Text>}
                        {field === 'username' && usernameStatus === 'available' && <Text style={styles.usernameOk}>Available ✓</Text>}
                        <View style={styles.inlineButtons}>
                            <Button mode="contained" onPress={() => saveField(field)} loading={isSaving} compact style={styles.saveBtn} labelStyle={{ fontSize: 12 }}>Save</Button>
                            <Button mode="text" onPress={cancelEdit} compact labelStyle={{ fontSize: 12 }}>Cancel</Button>
                        </View>
                    </View>
                ) : (
                    <Text style={value ? styles.fieldValue : styles.fieldValueEmpty}>{value || placeholder}</Text>
                )}
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                    <TouchableOpacity onPress={handleAvatarUpload} disabled={avatarUploading} style={styles.avatarWrapper}>
                        {profile?.avatarUrl ? <Avatar.Image size={88} source={{ uri: profile.avatarUrl }} /> : <Avatar.Text size={88} label={avatarLabel} style={styles.avatarText} />}
                        <View style={styles.avatarEditBadge}>{avatarUploading ? <ActivityIndicator size={12} color="#fff" /> : <MaterialCommunityIcons name="camera" size={14} color="#fff" />}</View>
                    </TouchableOpacity>
                    <Text variant="headlineSmall" style={styles.name}>{displayName}</Text>
                    <Text style={styles.emailText}>{displayEmail}</Text>
                    {isOAuthUser && <View style={styles.oauthBadge}><MaterialCommunityIcons name="google" size={12} color="#fff" /><Text style={styles.oauthBadgeText}>Google Account</Text></View>}
                    <TouchableOpacity style={styles.shareProfileBtn} onPress={handleShareProfile} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="share-variant-outline" size={14} color="#fff" />
                        <Text style={styles.shareProfileBtnText}>Share Profile</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.content}>
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionLabel}>Profile Details</Text>
                            <EditableRow field="fullName" icon="account-outline" label="Full Name" value={profile?.fullName || ''} placeholder="Tap ✏ to add your name" />
                            <Divider style={styles.divider} />
                            <EditableRow field="username" icon="at" label="Username" value={profile?.username || ''} placeholder="Tap ✏ to set a unique username" />
                            <Divider style={styles.divider} />
                                    <View style={styles.editableRow}>
                                <View style={styles.editableRowHeader}>
                                    <View style={styles.editableRowLeft}><MaterialCommunityIcons name="email-outline" size={16} color={Colors.textTertiary} /><Text style={styles.fieldLabel}>Email</Text></View>
                                    {!isOAuthUser && <TouchableOpacity onPress={() => { setNewEmailInput(''); setEmailChangeError(''); setEmailStep('form'); }} style={styles.pencilBtn}>
                                        <MaterialCommunityIcons name="pencil-outline" size={15} color={Colors.primary} />
                                    </TouchableOpacity>}
                                </View>
                                <Text style={styles.fieldValue}>{displayEmail}</Text>
                            </View>
                            <Divider style={styles.divider} />
                            <EditableRow field="website" icon="web" label="Website" value={profile?.website || ''} placeholder="Tap ✏ to add your website" />
                            <Divider style={styles.divider} />
                            <TouchableOpacity style={styles.editableRow} onPress={() => setLangModalVisible(true)}>
                                <View style={styles.editableRowHeader}><View style={styles.editableRowLeft}><MaterialCommunityIcons name="translate" size={16} color={Colors.textTertiary} /><Text style={styles.fieldLabel}>Language</Text></View><MaterialCommunityIcons name="chevron-right" size={18} color={Colors.grey} /></View>
                                <Text style={styles.fieldValue}>{langLabel}</Text>
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionLabel}>Security & Account</Text>
                            <SecurityRow icon="cog-outline" title="Settings" subtitle="Notifications, theme, data, delete" onPress={() => navigation.navigate('Settings')} />
                            {!isOAuthUser && <SecurityRow icon="lock-reset" title="Change Password" subtitle="Update your login password" onPress={() => navigation.navigate('ChangePassword')} />}
                            <SecurityRow icon="shield-lock-outline" title="Two-Factor Authentication" onPress={() => navigation.navigate('TwoFASetup')} />
                            <SecurityRow icon="cellphone-link" title="Active Sessions" subtitle="View your current device sessions" onPress={() => navigation.navigate('SessionManagement')} />
                        </Card.Content>
                    </Card>

                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
                        <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

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

            {/* Email Change Modal */}
            <Portal>
                <Modal visible={emailStep !== 'idle'} onDismiss={() => setEmailStep('idle')} contentContainerStyle={styles.modalContent}>
                    {emailStep === 'form' ? (
                        <>
                            <Text variant="titleMedium" style={styles.modalTitle}>Change Email</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>Enter your new email address. A confirmation link will be sent to it.</Text>
                            <TextInput
                                label="New Email"
                                value={newEmailInput}
                                onChangeText={v => { setNewEmailInput(v); setEmailChangeError(''); }}
                                mode="outlined"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                left={<TextInput.Icon icon="email-outline" />}
                                outlineColor={emailChangeError ? Colors.error : Colors.border}
                                activeOutlineColor={Colors.primary}
                                style={{ marginBottom: 4 }}
                            />
                            {emailChangeError ? <HelperText type="error">{emailChangeError}</HelperText> : null}
                            <GradientButton title="Send Confirmation" onPress={handleEmailChangeSubmit} loading={emailChanging} disabled={emailChanging} icon="email-check-outline" style={{ marginTop: 16 }} />
                            <Button mode="text" onPress={() => setEmailStep('idle')} style={{ marginTop: 8 }}>Cancel</Button>
                        </>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="email-check-outline" size={52} color={Colors.success} style={{ alignSelf: 'center', marginBottom: 12 }} />
                            <Text variant="titleMedium" style={[styles.modalTitle, { color: Colors.success }]}>Confirmation Sent</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                                Check <Text style={{ fontWeight: 'bold', color: Colors.text }}>{newEmailInput}</Text> and click the link to confirm your new email.
                            </Text>
                            <Button mode="contained" onPress={() => setEmailStep('idle')} style={{ marginTop: 20 }}>Done</Button>
                        </>
                    )}
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    header: { alignItems: 'center', paddingTop: Layout.spacing.xxl, paddingBottom: Layout.spacing.xxl, borderBottomLeftRadius: Layout.headerBorderRadius, borderBottomRightRadius: Layout.headerBorderRadius },
    avatarWrapper: { position: 'relative', marginBottom: Layout.spacing.sm },
    avatarText: { backgroundColor: 'rgba(255,255,255,0.25)' },
    avatarEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    name: { fontWeight: 'bold', color: Colors.textLight, marginTop: 4 },
    emailText: { color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 13 },
    oauthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Layout.radius.full, marginTop: 8 },
    oauthBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 4 },
    shareProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 6 },
    shareProfileBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    content: { padding: Layout.spacing.lg },
    card: { marginBottom: Layout.spacing.lg, backgroundColor: Colors.cardBackground, borderRadius: Layout.radius.lg },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Layout.spacing.md },
    divider: { marginVertical: Layout.spacing.xs },
    editableRow: { paddingVertical: Layout.spacing.sm },
    editableRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    editableRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fieldLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldValue: { fontSize: 15, color: Colors.text, marginTop: 3, paddingLeft: 24 },
    fieldValueEmpty: { fontSize: 14, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 3, paddingLeft: 24 },
    pencilBtn: { padding: 4 },
    inlineInput: { backgroundColor: Colors.surface, marginTop: 4 },
    inlineButtons: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    saveBtn: { marginRight: 8 },
    usernameError: { fontSize: 12, color: Colors.error, marginTop: 2, paddingLeft: 4 },
    usernameOk: { fontSize: 12, color: Colors.success, marginTop: 2, paddingLeft: 4 },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Layout.spacing.lg, borderRadius: Layout.radius.md, borderWidth: 1, borderColor: Colors.error, marginTop: Layout.spacing.sm },
    signOutText: { color: Colors.error, fontWeight: '600', marginLeft: Layout.spacing.sm },
    langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Layout.spacing.sm },
    langLabel: { fontSize: 15, color: Colors.text, marginLeft: 4 },
    modalContent: { backgroundColor: Colors.modalBackground, padding: Layout.modalPadding, margin: Layout.modalMargin, borderRadius: Layout.modalRadius },
    modalTitle: { marginBottom: Layout.spacing.lg, textAlign: 'center', color: Colors.text, fontWeight: '600' },
});

export default ProfileScreen;
