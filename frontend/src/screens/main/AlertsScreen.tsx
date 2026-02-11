import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, ActivityIndicator, useTheme, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockDataService, AlertItem } from '../../services/mockDataService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const AlertsScreen = () => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

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
            case 'warning': return theme.colors.error;
            case 'success': return 'green';
            case 'info': default: return theme.colors.primary;
        }
    };

    const renderItem = ({ item }: { item: AlertItem }) => (
        <List.Item
            title={item.title}
            description={item.message}
            left={props => (
                <View style={[styles.iconContainer, { backgroundColor: '#f0f0f0' }]}>
                    <MaterialCommunityIcons name={getIcon(item.type)} size={24} color={getColor(item.type)} />
                </View>
            )}
            right={props => (
                <View style={styles.rightContainer}>
                    <Text variant="labelSmall" style={styles.date}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    {!item.read && <Badge size={8} style={{ alignSelf: 'flex-end', marginTop: 4 }} />}
                </View>
            )}
            style={[styles.item, !item.read && styles.unreadItem]}
            titleStyle={!item.read ? styles.unreadText : undefined}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.headerTitle}>Notifications</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator /></View>
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
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 16, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { backgroundColor: 'white' },
    item: { paddingVertical: 8 },
    unreadItem: { backgroundColor: '#e3f2fd' },
    unreadText: { fontWeight: 'bold' },
    iconContainer: { justifyContent: 'center', alignItems: 'center', width: 40, height: 40, borderRadius: 20, marginLeft: 16 },
    rightContainer: { justifyContent: 'center', paddingRight: 16 },
    date: { color: '#888' },
    separator: { height: 1, backgroundColor: '#eee' }
});

export default AlertsScreen;
