import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Card, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const SessionManagementScreen = ({ navigation }: any) => {
    const { logout, user } = useAuth();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });
    }, []);

    const fmt = (dateStr: string) => new Date(dateStr).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const fmtTs = (ts: number) => new Date(ts * 1000).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const isExpired = session?.expires_at ? session.expires_at * 1000 < Date.now() : false;
    const expiresIn = session?.expires_at
        ? (() => {
            const ms = session.expires_at * 1000 - Date.now();
            if (ms <= 0) return 'Expired';
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
        })()
        : null;

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'This will sign you out from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
            ]
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    const DetailRow = ({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) => (
        <View style={styles.detailRow}>
            <MaterialCommunityIcons name={icon as any} size={16} color={Colors.textTertiary} style={styles.detailIcon} />
            <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Current Session Card */}
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="shield-check" size={18} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>Current Session</Text>
                    <Chip compact style={[styles.statusChip, isExpired ? styles.chipExpired : styles.chipActive]} textStyle={styles.chipText}>
                        {isExpired ? 'Expired' : 'Active'}
                    </Chip>
                </View>

                <Card style={styles.card}>
                    <Card.Content>
                        {/* Account */}
                        <Text style={styles.cardSectionLabel}>Account</Text>
                        <DetailRow icon="account-circle-outline" label="Email" value={user?.email ?? '—'} />
                        <DetailRow icon="badge-account-outline" label="User ID" value={session?.user?.id ? `${session.user.id.substring(0, 8)}…` : '—'} />
                        <DetailRow icon="shield-account-outline" label="Auth Provider" value={session?.user?.app_metadata?.provider ?? 'email'} />

                        <Divider style={styles.divider} />

                        {/* Session Timing */}
                        <Text style={styles.cardSectionLabel}>Session Timing</Text>
                        {session?.created_at && (
                            <DetailRow icon="login" label="Signed In" value={fmt(session.created_at)} />
                        )}
                        {session?.expires_at && (
                            <DetailRow
                                icon="timer-outline"
                                label="Session Expires"
                                value={fmtTs(session.expires_at)}
                            />
                        )}
                        {expiresIn && (
                            <DetailRow
                                icon="clock-outline"
                                label="Time Remaining"
                                value={expiresIn}
                                valueColor={isExpired ? Colors.error : Colors.success}
                            />
                        )}

                        <Divider style={styles.divider} />

                        {/* Device Info */}
                        <Text style={styles.cardSectionLabel}>Device</Text>
                        <DetailRow icon="cellphone" label="Device" value={Constants.deviceName ?? 'Unknown'} />
                        <DetailRow icon="devices" label="OS" value={`${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`} />
                        <DetailRow icon="application-outline" label="App Version" value={`v${Constants.expoConfig?.version ?? '?'} (build ${Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '?'})`} />
                        <DetailRow icon="shield-outline" label="Environment" value={Constants.appOwnership === 'expo' ? 'Expo Go' : 'Standalone Build'} />
                    </Card.Content>
                </Card>

                <View style={styles.noteBox}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.noteText}>
                        Sessions auto-refresh and are managed by Supabase Auth. Signing out here immediately invalidates this device's session.
                    </Text>
                </View>

                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="logout" size={18} color={Colors.error} />
                    <Text style={styles.signOutText}>Sign Out This Device</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    sectionTitle: { fontWeight: '700', color: Colors.text, fontSize: 15, flex: 1 },
    statusChip: { alignSelf: 'flex-start' },
    chipActive: { backgroundColor: Colors.successLight ?? '#e8f5e9' },
    chipExpired: { backgroundColor: Colors.errorLight },
    chipText: { fontSize: 11, fontWeight: '700' },
    card: { marginBottom: 16, backgroundColor: Colors.surface, borderRadius: 12 },
    cardSectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
    detailIcon: { marginRight: 10, marginTop: 2 },
    detailContent: { flex: 1 },
    detailLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 1 },
    detailValue: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    divider: { marginVertical: 10 },
    noteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
    noteText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.error },
    signOutText: { color: Colors.error, fontWeight: '600', marginLeft: 8 },
});

export default SessionManagementScreen;
