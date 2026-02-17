import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, FAB, Chip, Searchbar, ActivityIndicator, List, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { InventoryService, InventoryItem } from '../../../services/inventoryService';
import InventoryActionModal from './InventoryActionModal';
import { EmptyState } from '../../../components/EmptyState';

const CATEGORIES = ['all', 'feed', 'chemical', 'medicine', 'equipment'];

const InventoryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { farmId, farmName } = route.params || { farmId: 'default-farm-id', farmName: 'My Farm' };
    // Fallback ID if not passed, ideally should come from context or route

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        loadInventory();
        const unsubscribe = navigation.addListener('focus', loadInventory);
        return unsubscribe;
    }, [farmId, selectedCategory]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const categoryFilter = selectedCategory === 'all' ? undefined : selectedCategory;
            const data = await InventoryService.fetchAll(farmId, categoryFilter);
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: InventoryItem }) => {
        const isLowStock = item.reorderLevel !== undefined && item.quantity <= item.reorderLevel;

        return (
            <List.Item
                title={item.name}
                description={() => (
                    <View>
                        <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
                            {item.category.toUpperCase()} • {item.quantity} {item.unit} available
                        </Text>
                        {isLowStock && (
                            <Text variant="labelSmall" style={{ color: Colors.error, marginTop: 2 }}>
                                ⚠️ Low Stock (Reorder: {item.reorderLevel})
                            </Text>
                        )}
                    </View>
                )}
                left={props => <List.Icon {...props} icon={getCategoryIcon(item.category)} color={Colors.primary} />}
                right={props => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="pencil" size={20} onPress={() => {/* Edit flow - maybe reuse modal later */ }} />
                    </View>
                )}
                style={[styles.item, isLowStock && styles.lowStockItem]}
            />
        );
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'feed': return 'food-drum';
            case 'chemical': return 'flask';
            case 'medicine': return 'pill';
            case 'equipment': return 'tools';
            default: return 'package-variant';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Inventory" subtitle={farmName} />

            <View style={styles.filterContainer}>
                <Searchbar
                    placeholder="Search items..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                />
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipContainer}
                    keyExtractor={item => item}
                    renderItem={({ item }) => (
                        <Chip
                            selected={selectedCategory === item}
                            onPress={() => setSelectedCategory(item)}
                            style={styles.chip}
                            showSelectedOverlay
                        >
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                        </Chip>
                    )}
                />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <EmptyState
                            icon="package-variant-closed"
                            title="No Items"
                            subtitle="No inventory items found."
                        />
                    }
                />
            )}

            <FAB
                icon="plus"
                style={styles.fab}
                label="Add Item"
                onPress={() => setModalVisible(true)}
            />

            <InventoryActionModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onSuccess={loadInventory}
                farmId={farmId}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    filterContainer: { paddingHorizontal: Layout.padding, paddingBottom: 8 },
    searchbar: { marginBottom: 12, backgroundColor: Colors.surface, elevation: 1 },
    chipContainer: { paddingBottom: 8 },
    chip: { marginRight: 8 },
    list: { paddingBottom: 80 },
    item: { backgroundColor: Colors.surface, marginBottom: 1, paddingVertical: 8 },
    lowStockItem: { backgroundColor: '#FFF0F0' }, // Light red tint
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.primary,
    },
});

export default InventoryScreen;
