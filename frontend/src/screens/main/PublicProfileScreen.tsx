import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, TouchableOpacity, Linking } from 'react-native';
import { Text, Avatar, ActivityIndicator, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { apiClient } from '../../services/apiClient';

const PublicProfileScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const username: string = route.params?.username ?? '';
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!username) { setError('No username provided.'); setLoading(false); return; }
        loadProfile();
    }, [username]);

    const loadProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiClient.get(`/profiles/public/${username.toLowerCase()}`);
            setProfile(data);
        } catch (e: any) {
            setError(e.message?.includes('404') || e.message?.includes('not found')
                ? 'Profile not found.'
                : 'Could not load profile. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleShareProfile = async () => {
        const profileUrl = `upcheckapp://profile/${username}`;
        await Share.share({
            message: `Check out ${profile?.fullName || username}'s profile on Upcheck!\n${profileUrl}`,
            title: `${profile?.fullName || username} on Upcheck`,
        });
    };

    const handleWebsite = () => {
        if (profile?.website) {
            const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
            Linking.openURL(url);
        }
    };

    const displayName = profile?.fullName || username || 'User';
    const avatarLabel = displayName.substring(0, 2).toUpperCase();

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Loading profile…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <MaterialCommunityIcons name="account-off-outline" size={64} color={Colors.grey} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : null} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    {profile?.avatarUrl
                        ? <Avatar.Image size={96} source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        : <Avatar.Text size={96} label={avatarLabel} style={styles.avatarText} />
                    }
                    <Text variant="headlineSmall" style={styles.name}>{displayName}</Text>
                    {profile?.username && (
                        <Text style={styles.handle}>@{profile.username}</Text>
                    )}
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShareProfile}>
                        <MaterialCommunityIcons name="share-variant" size={16} color="#fff" />
                        <Text style={styles.shareBtnText}>Share Profile</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.content}>
                    {(profile?.bio) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionLabel}>About</Text>
                            <Text style={styles.bioText}>{profile.bio}</Text>
                        </View>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Info</Text>
                        {profile?.website ? (
                            <TouchableOpacity style={styles.infoRow} onPress={handleWebsite}>
                                <MaterialCommunityIcons name="web" size={18} color={Colors.primary} />
                                <Text style={[styles.infoText, styles.link]}>{profile.website}</Text>
                            </TouchableOpacity>
                        ) : null}
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.textTertiary} />
                            <Text style={styles.infoText}>
                                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="fish" size={18} color={Colors.textTertiary} />
                            <Text style={styles.infoText}>Aquaculture Farmer</Text>
                        </View>
                    </View>

                    <View style={styles.appBadge}>
                        <MaterialCommunityIcons name="water" size={20} color={Colors.primary} />
                        <Text style={styles.appBadgeText}>This profile is on <Text style={{ fontWeight: 'bold', color: Colors.primary }}>Upcheck</Text> — Aquaculture Management App</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    header: { alignItems: 'center', paddingTop: Layout.spacing.xxl, paddingBottom: Layout.spacing.xxl, borderBottomLeftRadius: Layout.headerBorderRadius, borderBottomRightRadius: Layout.headerBorderRadius },
    avatar: { marginBottom: Layout.spacing.sm },
    avatarText: { backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: Layout.spacing.sm },
    name: { fontWeight: 'bold', color: '#fff', marginTop: 4 },
    handle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginTop: 14, gap: 6 },
    shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    content: { padding: Layout.spacing.lg },
    card: { backgroundColor: Colors.cardBackground, borderRadius: Layout.radius.lg, padding: 16, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    bioText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
    infoText: { color: Colors.textSecondary, fontSize: 14 },
    link: { color: Colors.primary, textDecorationLine: 'underline' },
    appBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryContainer, padding: 12, borderRadius: 10, gap: 10, marginTop: 4 },
    appBadgeText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
    errorText: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 24 },
    backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    backBtnText: { color: '#fff', fontWeight: '600' },
});

export default PublicProfileScreen;
