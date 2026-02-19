import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const handleSignOutAll = () => {
        Alert.alert(
            'Sign Out All Devices',
            'This will sign you out from this device. Supabase sessions on other devices will expire naturally.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
            ]
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>Active Sessions</Text>
            </View>

            <View style={styles.content}>
                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <MaterialCommunityIcons name="cellphone" size={36} color={Colors.primary} style={{ marginRight: 16 }} />
                        <View style={styles.info}>
                            <Text style={styles.deviceName}>This Device</Text>
                            <Text style={styles.detail}>{user?.email}</Text>
                            {session?.created_at && (
                                <Text style={styles.detail}>Signed in: {new Date(session.created_at).toLocaleString()}</Text>
                            )}
                            {session?.expires_at && (
                                <Text style={styles.detail}>Expires: {formatDate(session.expires_at)}</Text>
                            )}
                            <Text style={[styles.detail, { color: Colors.success }]}>● Active</Text>
                        </View>
                    </Card.Content>
                </Card>

                <View style={styles.noteBox}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.noteText}>
                        Session management across multiple devices is handled by Supabase Auth. Signing out here ends your current session.
                    </Text>
                </View>

                <TouchableOpacity style={styles.signOutAllBtn} onPress={handleSignOutAll} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="logout" size={18} color={Colors.error} />
                    <Text style={styles.signOutAllText}>Sign Out This Device</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontWeight: 'bold', color: Colors.text },
    content: { padding: 16 },
    card: { marginBottom: 16, backgroundColor: Colors.surface, borderRadius: 12 },
    cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
    info: { flex: 1 },
    deviceName: { fontWeight: 'bold', fontSize: 15, color: Colors.text, marginBottom: 4 },
    detail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
    noteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
    noteText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
    signOutAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.error },
    signOutAllText: { color: Colors.error, fontWeight: '600', marginLeft: 8 },
});

export default SessionManagementScreen;
