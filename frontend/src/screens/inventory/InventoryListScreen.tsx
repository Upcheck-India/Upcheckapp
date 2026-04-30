import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { FAB } from '../../components/ui/FAB';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { inventoryApi, InventoryItem } from '../../api/inventory';
import { useFocusEffect } from '@react-navigation/native';

const CATEGORIES = [
    { key: 'all', label: 'All', icon: 'database' },
    { key: 'feed', label: 'Feed', icon: 'corn' },
    { key: 'chemical', label: 'Chemicals', icon: 'flask' },
    { key: 'equipment', label: 'Equipment', icon: 'tools' },
    { key: 'other', label: 'Other', icon: 'package-variant' },
];

export const InventoryListScreen = ({ navigation }: any) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const fetchInventory = async () => {
        try {
            const { data } = await inventoryApi.getAll('');
            setInventory(data);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchInventory();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchInventory();
    };

    const filteredInventory = selectedCategory === 'all'
        ? inventory
        : inventory.filter(item => item.category === selectedCategory);

    const lowStockItems = inventory.filter(item => item.currentStock <= item.minStockThreshold);

    const getStockStatus = (item: InventoryItem) => {
        if (item.currentStock <= 0) return { color: theme.roles.light.dangerText, label: 'Out of Stock' };
        if (item.currentStock <= item.minStockThreshold) return { color: theme.roles.light.warningText, label: 'Low Stock' };
        return { color: theme.roles.light.successText, label: 'In Stock' };
    };

    const renderCategoryTab = (category: { key: string; label: string; icon: string }) => (
        <TouchableOpacity
            key={category.key}
            style={[
                styles.categoryTab,
                selectedCategory === category.key && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category.key)}
        >
            <MaterialCommunityIcons
                name={category.icon as any}
                size={18}
                color={selectedCategory === category.key ? theme.roles.light.primary : theme.roles.light.textSecondary}
            />
            <Text style={[
                styles.categoryLabel,
                selectedCategory === category.key && styles.categoryLabelActive
            ]}>
                {category.label}
            </Text>
        </TouchableOpacity>
    );

    const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
        const status = getStockStatus(item);
        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('InventoryDetail', { inventoryId: item.id, itemName: item.name })}
                activeOpacity={0.7}
            >
                <Card style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                        <View style={[styles.categoryIcon, { backgroundColor: status.color + '20' }]}>
                            <MaterialCommunityIcons
                                name={item.category === 'feed' ? 'corn' : item.category === 'chemical' ? 'flask' : 'package-variant'}
                                size={20}
                                color={status.color}
                            />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemCategory}>{item.category}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                    </View>
                    <View style={styles.itemFooter}>
                        <Text style={styles.stockText}>
                            <Text style={styles.stockValue}>{item.currentStock}</Text> {item.unit}
                        </Text>
                        <Text style={styles.thresholdText}>
                            Min: {item.minStockThreshold} {item.unit}
                        </Text>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Inventory</Text>
                {lowStockItems.length > 0 && (
                    <TouchableOpacity style={styles.alertBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color={theme.roles.light.warningText} />
                        <Text style={styles.alertText}>{lowStockItems.length}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.categoryBar}>
                {CATEGORIES.map(renderCategoryTab)}
            </View>

            <FlatList
                data={filteredInventory}
                keyExtractor={(item) => item.id}
                renderItem={renderInventoryItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.roles.light.primary]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="database"
                            title="No Inventory Items"
                            subtitle="Start tracking your feed, chemicals, and equipment stock."
                            actionLabel="Add Item"
                            onAction={() => Alert.alert('Add Item', 'Create inventory item functionality coming soon!')}
                        />
                    ) : null
                }
            />

            <FAB icon="plus" onPress={() => Alert.alert('Add Item', 'Create inventory item functionality coming soon!')} />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    headerTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
    },
    alertBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.roles.light.warningBg,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.md,
    },
    alertText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.warningText,
        marginLeft: theme.spacing[1],
    },
    categoryBar: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    categoryTabActive: {
        backgroundColor: theme.roles.light.primary + '20',
    },
    categoryLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginLeft: theme.spacing[1],
    },
    categoryLabelActive: {
        color: theme.roles.light.primary,
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    itemCard: {
        marginBottom: theme.spacing[3],
        padding: theme.spacing[4],
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
        marginLeft: theme.spacing[3],
    },
    itemName: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    itemCategory: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    statusText: {
        ...theme.typeScale.labelSmall,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing[3],
        paddingTop: theme.spacing[3],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
    },
    stockText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    stockValue: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    thresholdText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textDisabled,
    },
});