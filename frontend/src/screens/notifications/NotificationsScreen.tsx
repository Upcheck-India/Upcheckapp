import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { alertsApi, AlertData } from '../../api/alerts';

export const NotificationsScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState<AlertData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const { data } = await alertsApi.findMine();
            setNotifications(data || []);
        } catch (error) {
            console.error('Failed to fetch alerts', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return 'alert-circle';
            case 'info': return 'information';
            case 'warning': return 'alert';
            default: return 'bell';
        }
    };

    const getIconColor = (severity: string) => {
        switch (severity) {
            case 'critical': return theme.roles.light.dangerText;
            case 'info': return theme.roles.light.infoBorder;
            case 'warning': return theme.roles.light.warningText;
            default: return theme.roles.light.primary;
        }
    };

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await alertsApi.markAsRead(id);
        } catch(e) {
            console.error('Failed to mark alert read', e);
        }
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await alertsApi.markAllAsRead();
        } catch (e) {
            console.error('Failed to mark all read', e);
        }
    };

    const renderItem = ({ item }: { item: AlertData }) => (
        <TouchableOpacity onPress={() => markAsRead(item.id)} activeOpacity={0.7}>
            <Card style={[styles.card, !item.isRead && styles.unreadCard]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={getIcon(item.severity)} size={24} color={getIconColor(item.severity)} />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={[styles.titleText, !item.isRead && styles.unreadText]}>{item.title}</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
            </Card>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="check-all" size={24} color={theme.roles.light.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="bell-outline" size={64} color={theme.roles.light.borderDefault} />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptyText}>You have no new notifications.</Text>
                    </View>
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: { padding: theme.spacing[4] },
    actionBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    listContent: {
        padding: theme.spacing[4],
    },
    card: {
        flexDirection: 'row',
        padding: theme.spacing[4],
        marginBottom: theme.spacing[3],
        backgroundColor: theme.roles.light.surface,
    },
    unreadCard: {
        backgroundColor: theme.roles.light.primary + '05', // Very light primary tint
    },
    iconContainer: {
        marginRight: theme.spacing[4],
        marginTop: 2,
    },
    contentContainer: {
        flex: 1,
    },
    titleText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        marginBottom: 4,
    },
    unreadText: {
        fontWeight: 'bold',
    },
    messageText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[2],
    },
    dateText: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textDisabled,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.roles.light.primary,
        marginTop: theme.spacing[3],
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    emptyText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
});
