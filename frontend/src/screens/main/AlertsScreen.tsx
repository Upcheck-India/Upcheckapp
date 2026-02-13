import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, ActivityIndicator, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockDataService, AlertItem } from '../../services/mockDataService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';

const AlertsScreen = () => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const data = await MockDataService.getAlerts();
            setAlerts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return 'alert-circle';
            case 'success': return 'check-circle';
            case 'info': default: return 'information';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'warning': return Colors.error;
            case 'success': return Colors.success;
            case 'info': default: return Colors.primary;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'warning': return Colors.errorLight;
            case 'success': return Colors.successLight;
            case 'info': default: return Colors.infoLight;
        }
    };

    const renderItem = ({ item }: { item: AlertItem }) => (
        <List.Item
            title={item.title}
            description={item.message}
            left={() => (
                <View style={[styles.iconContainer, { backgroundColor: getBgColor(item.type) }]}>
                    <MaterialCommunityIcons name={getIcon(item.type) as any} size={22} color={getColor(item.type)} />
                </View>
            )}
            right={() => (
                <View style={styles.rightContainer}>
                    <Text variant="labelSmall" style={styles.date}>
                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {!item.read && <Badge size={8} style={styles.unreadBadge} />}
                </View>
            )}
            style={[styles.item, !item.read && styles.unreadItem]}
            titleStyle={!item.read ? styles.unreadText : styles.readTitle}
            descriptionStyle={styles.description}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Notifications" subtitle="Stay updated on your farm activity" variant="flat" />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
            ) : alerts.length === 0 ? (
                <EmptyState
                    icon="bell-off-outline"
                    title="No notifications"
                    subtitle="You're all caught up! We'll notify you when something needs your attention."
                />
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onRefresh={loadAlerts}
                    refreshing={loading}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { backgroundColor: Colors.surface },
    item: { paddingVertical: Layout.spacing.sm },
    unreadItem: { backgroundColor: Colors.unreadBackground },
    unreadText: { fontWeight: 'bold', color: Colors.text },
    readTitle: { color: Colors.text },
    description: { color: Colors.textSecondary, fontSize: 13 },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: Layout.spacing.lg,
    },
    rightContainer: { justifyContent: 'center', paddingRight: Layout.spacing.lg },
    date: { color: Colors.textTertiary },
    unreadBadge: { alignSelf: 'flex-end', marginTop: Layout.spacing.xs, backgroundColor: Colors.primary },
    separator: { height: 1, backgroundColor: Colors.divider },
});

export default AlertsScreen;
