import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Avatar, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Alert, AlertsService } from '../../services/alertsService';

export const AlertsScreen = ({ navigation }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAlerts = async () => {
        try {
            const data = await AlertsService.fetchAlerts();
            setAlerts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAlerts();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadAlerts();
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            // Optimistic update
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
            await AlertsService.markAsRead(id);
        } catch (error) {
            console.error(error);
            loadAlerts(); // Revert on error
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
            await AlertsService.markAllAsRead();
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'inventory_low_stock': return 'package-variant-closed';
            case 'water_quality': return 'water-alert';
            case 'system': return 'cogs';
            default: return 'bell';
        }
    };

    const getColor = (severity: string) => {
        switch (severity) {
            case 'critical': return Colors.error;
            case 'warning': return Colors.warning;
            default: return Colors.primary;
        }
    };

    const renderItem = ({ item }: { item: Alert }) => (
        <TouchableOpacity
            style={[styles.card, !item.isRead && styles.unreadCard]}
            onPress={() => handleMarkAsRead(item.id)}
        >
            <View style={styles.iconContainer}>
                <Avatar.Icon
                    size={40}
                    icon={getIcon(item.type)}
                    style={{ backgroundColor: getColor(item.severity) + '20' }}
                    color={getColor(item.severity)}
                />
            </View>
            <View style={styles.textContainer}>
                <Text variant="titleSmall" style={[styles.title, !item.isRead && styles.bold]}>
                    {item.title}
                </Text>
                <Text variant="bodyMedium" style={styles.message} numberOfLines={2}>
                    {item.message}
                </Text>
                <Text variant="labelSmall" style={styles.time}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Notifications</Text>
                <IconButton icon="check-all" onPress={handleMarkAllRead} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator /></View>
            ) : (
                <FlatList
                    data={alerts}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text variant="bodyLarge" style={{ color: Colors.textSecondary }}>No notifications</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.padding,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    list: {
        padding: Layout.padding,
    },
    card: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: Colors.surfaceVariant, // Slightly different bg for unread? Or keep white but add dot
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    iconContainer: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: Colors.text,
        marginBottom: 4,
    },
    bold: {
        fontWeight: 'bold',
    },
    message: {
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    time: {
        color: Colors.textTertiary,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginLeft: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
