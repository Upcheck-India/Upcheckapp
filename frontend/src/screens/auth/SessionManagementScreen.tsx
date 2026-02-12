import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { AuthService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Session {
    id: string;
    ipAddress: string;
    deviceType: string;
    deviceOs: string;
    browser: string;
    createdAt: string;
    lastActiveAt?: string;
    isCurrent?: boolean; // We might need to logic this out or backend sends it
}

const SessionManagementScreen = ({ navigation }: any) => {
    const { accessToken } = useAuthStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await AuthService.getSessions(accessToken!);
            setSessions(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (sessionId: string) => {
        Alert.alert(
            'Revoke Session',
            'Are you sure you want to revoke this session? The device will be logged out.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AuthService.revokeSession(accessToken!, sessionId);
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to revoke session');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Session }) => {
        const iconName = item.deviceType === 'mobile' ? 'cellphone' : 'monitor';

        return (
            <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name={iconName} size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.deviceName}>{item.deviceOs} - {item.browser}</Text>
                        <Text style={styles.ipAddress}>IP: {item.ipAddress}</Text>
                        <Text style={styles.date}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <IconButton
                        icon="delete"
                        iconColor={Colors.error}
                        onPress={() => handleRevoke(item.id)}
                    />
                </Card.Content>
            </Card>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>Active Sessions</Text>
            </View>
            <FlatList
                data={sessions}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No active sessions found.</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    listContent: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
        backgroundColor: Colors.surface,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    deviceName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: Colors.text,
    },
    ipAddress: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    date: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: Colors.textSecondary,
    }
});

export default SessionManagementScreen;
