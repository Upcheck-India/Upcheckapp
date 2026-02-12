import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { ProfileService } from '../../services/profileService';
import { Profile } from '../../types/database';
import { Colors } from '../../constants/Colors';

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const { user, logout } = useAuthStore();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    // Edit Form
    const [fullName, setFullName] = useState('');
    const [website, setWebsite] = useState('');
    const [username, setUsername] = useState('');

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
                    setFullName(data.full_name || '');
                    setWebsite(data.website || '');
                    setUsername(data.username || '');
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
            await ProfileService.updateProfile(profile.id, {
                full_name: fullName,
                website,
                username
            });
            setEditModalVisible(false);
            loadProfile();
            Alert.alert('Success', 'Profile updated');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        setSigningOut(true);
                        try {
                            await logout();
                            // Reset navigation to Login screen
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Login' }],
                                })
                            );
                        } catch (error) {
                            Alert.alert('Error', 'Failed to sign out');
                        } finally {
                            setSigningOut(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Avatar.Text size={80} label={profile?.full_name?.substring(0, 2).toUpperCase() || 'U'} />
                    <Text variant="headlineSmall" style={styles.name}>{profile?.full_name || 'User'}</Text>
                    <Text variant="bodyMedium" style={styles.email}>{profile?.email || 'No Email'}</Text>
                </View>

                <Card style={styles.infoCard}>
                    <Card.Title title="Personal Information" />
                    <Card.Content>
                        <Text style={styles.label}>Username</Text>
                        <Text style={styles.value}>{profile?.username || 'Not set'}</Text>
                        <Divider style={styles.divider} />

                        <Text style={styles.label}>Website</Text>
                        <Text style={styles.value}>{profile?.website || 'Not set'}</Text>
                        <Divider style={styles.divider} />

                        <Text style={styles.label}>Language</Text>
                        <Text style={styles.value}>{profile?.language_preference || 'en'}</Text>
                    </Card.Content>
                    <Card.Actions>
                        <Button onPress={() => setEditModalVisible(true)}>Edit Profile</Button>
                    </Card.Actions>
                </Card>

                <View style={styles.actionSection}>
                    <Button mode="outlined" icon="logout" onPress={handleSignOut} style={styles.signOutBtn} textColor="red">
                        Sign Out
                    </Button>
                </View>

                <Card style={[styles.infoCard, { marginTop: 16 }]}>
                    <Card.Title title="Security & Login" />
                    <Card.Content>
                        <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('ChangePassword')}
                            style={styles.securityBtn}
                            icon="lock-reset"
                        >
                            Change Password
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('TwoFASetup')}
                            style={styles.securityBtn}
                            icon="shield-account"
                        >
                            Two-Factor Authentication
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('SessionManagement')}
                            style={styles.securityBtn}
                            icon="devices"
                        >
                            Active Sessions
                        </Button>
                    </Card.Content>
                </Card>

            </ScrollView>

            <Portal>
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Edit Profile</Text>

                    <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} />
                    <TextInput label="Username" value={username} onChangeText={setUsername} mode="outlined" style={styles.input} autoCapitalize="none" />
                    <TextInput label="Website" value={website} onChangeText={setWebsite} mode="outlined" style={styles.input} autoCapitalize="none" inputMode="url" />

                    <Button mode="contained" onPress={handleUpdate} style={styles.button}>
                        Save Changes
                    </Button>
                    <Button mode="text" onPress={() => setEditModalVisible(false)} style={styles.button}>
                        Cancel
                    </Button>
                </Modal>
            </Portal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    header: { alignItems: 'center', marginBottom: 24, paddingVertical: 16 },
    name: { marginTop: 12, fontWeight: 'bold', color: Colors.text },
    email: { color: Colors.textSecondary },
    infoCard: { marginBottom: 24, backgroundColor: Colors.surface },
    label: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
    value: { fontSize: 16, marginBottom: 8, color: Colors.text },
    divider: { marginVertical: 8 },
    actionSection: { marginTop: 20 },
    signOutBtn: { borderColor: Colors.error },
    modalContent: { backgroundColor: Colors.surface, padding: 20, margin: 20, borderRadius: 8 },
    modalTitle: { marginBottom: 16, textAlign: 'center', color: Colors.text },
    input: { marginBottom: 12 },
    button: { marginTop: 8 },
    securityBtn: { marginBottom: 12, borderColor: Colors.border }
});

export default ProfileScreen;
