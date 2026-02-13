import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, TouchableOpacity } from 'react-native';
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
}

const SessionManagementScreen = ({ navigation }: any) => {
    const { accessToken, logoutAllDevices } = useAuthStore();
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
            'Are you sure? The device will be logged out.',
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

    const handleLogoutAll = () => {
        Alert.alert(
            'Logout All Devices',
            'This will sign you out from ALL devices including this one. You will need to login again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logoutAllDevices();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to logout all devices');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
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
                        <Text style={styles.ipAddress}>IP: {item.ipAddress || 'Unknown'}</Text>
                        {item.lastActiveAt && (
                            <Text style={styles.date}>Last active: {formatDate(item.lastActiveAt)}</Text>
                        )}
                        <Text style={styles.date}>Created: {formatDate(item.createdAt)}</Text>
                    </View>
                    <IconButton
                        icon="close-circle"
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
                <View style={styles.headerRow}>
                    <Text variant="headlineSmall" style={styles.title}>Active Sessions</Text>
                    <Text style={styles.countBadge}>{sessions.length}</Text>
                </View>
                {sessions.length > 1 && (
                    <TouchableOpacity style={styles.logoutAllButton} onPress={handleLogoutAll}>
                        <MaterialCommunityIcons name="logout" size={18} color={Colors.error} />
                        <Text style={styles.logoutAllText}>Logout All Devices</Text>
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={sessions}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="devices" size={48} color={Colors.grey} />
                        <Text style={styles.emptyText}>No active sessions found.</Text>
                    </View>
                }
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    countBadge: {
        marginLeft: 8,
        backgroundColor: Colors.primary,
        color: Colors.textLight,
        fontSize: 13,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    logoutAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    logoutAllText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    listContent: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
        backgroundColor: Colors.surface,
        borderRadius: 12,
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
        fontSize: 15,
        color: Colors.text,
    },
    ipAddress: {
        color: Colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    date: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 48,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 12,
        color: Colors.textSecondary,
        fontSize: 15,
    },
});

export default SessionManagementScreen;
