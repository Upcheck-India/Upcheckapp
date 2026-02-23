import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'alert' | 'info' | 'success';
    date: string;
    read: boolean;
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'Low DO Warning',
        message: 'Pond A3 DO level has dropped below 4.0 mg/L.',
        type: 'alert',
        date: new Date().toISOString(),
        read: false,
    },
    {
        id: '2',
        title: 'Feeding Needed',
        message: 'Scheduled feeding for Pond B1 is past due.',
        type: 'info',
        date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: false,
    },
    {
        id: '3',
        title: 'Simulation Complete',
        message: 'Cycle projection for Pond C2 is ready to view.',
        type: 'success',
        date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        read: true,
    },
];

export const NotificationsScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState(mockNotifications);

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'alert': return 'alert-circle';
            case 'info': return 'information';
            case 'success': return 'check-circle';
            default: return 'bell';
        }
    };

    const getIconColor = (type: Notification['type']) => {
        switch (type) {
            case 'alert': return theme.roles.light.dangerText;
            case 'info': return theme.roles.light.infoBorder;
            case 'success': return theme.roles.light.successText;
            default: return theme.roles.light.primary;
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity onPress={() => markAsRead(item.id)} activeOpacity={0.7}>
            <Card style={[styles.card, !item.read && styles.unreadCard]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={getIcon(item.type)} size={24} color={getIconColor(item.type)} />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={[styles.titleText, !item.read && styles.unreadText]}>{item.title}</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={styles.dateText}>
                        {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
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
