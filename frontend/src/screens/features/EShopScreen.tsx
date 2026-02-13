import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, Chip, Card, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MockProductService, Product } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { EmptyState } from '../../components/EmptyState';

const EShopScreen = () => {
    const navigation = useNavigation<any>();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = MockProductService.getCategories();

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [searchQuery, selectedCategory, products]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await MockProductService.getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filterProducts = () => {
        let filtered = products;

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        if (searchQuery) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        setFilteredProducts(filtered);
    };

    const renderItem = ({ item }: { item: Product }) => (
        <Card
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
        >
            <Card.Cover source={{ uri: item.imageUrl }} style={styles.cardCover} />
            <Card.Content style={styles.cardContent}>
                <Text variant="titleSmall" style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text variant="titleMedium" style={styles.price}>
                    {item.currency}{item.price}
                </Text>
                <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={14} color={Colors.warning} />
                    <Text variant="bodySmall" style={styles.rating}>{item.rating}</Text>
                    <Text variant="bodySmall" style={styles.category}>{item.category}</Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Searchbar
                    placeholder="Search products..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                    iconColor={Colors.grey}
                />
                <FlatList
                    horizontal
                    data={categories}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.categoryList}
                    renderItem={({ item }) => (
                        <Chip
                            selected={selectedCategory === item}
                            onPress={() => setSelectedCategory(item)}
                            style={[
                                styles.chip,
                                selectedCategory === item && styles.chipSelected,
                            ]}
                            textStyle={selectedCategory === item ? styles.chipTextSelected : styles.chipText}
                            showSelectedOverlay={false}
                        >
                            {item}
                        </Chip>
                    )}
                />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
            ) : filteredProducts.length === 0 ? (
                <EmptyState
                    icon="store-search-outline"
                    title="No products found"
                    subtitle={searchQuery ? `No results for "${searchQuery}". Try a different search term.` : 'No products available in this category.'}
                />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    numColumns={2}
                    contentContainerStyle={styles.productList}
                    columnWrapperStyle={styles.row}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        backgroundColor: Colors.surface,
        paddingBottom: Layout.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.tabBarBorder,
    },
    searchBar: {
        margin: Layout.spacing.lg,
        backgroundColor: Colors.surfaceVariant,
        borderRadius: Layout.radius.md,
        elevation: 0,
    },
    searchInput: { fontSize: 14 },
    categoryList: { paddingHorizontal: Layout.spacing.lg },
    chip: {
        marginRight: Layout.spacing.sm,
        backgroundColor: Colors.surfaceVariant,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
    },
    chipText: { color: Colors.textSecondary },
    chipTextSelected: { color: Colors.textLight, fontWeight: '600' },
    productList: { padding: Layout.spacing.md },
    row: { justifyContent: 'space-between' },
    card: {
        width: '48%',
        marginBottom: Layout.spacing.md,
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.radius.lg,
        ...Layout.shadow.sm,
    },
    cardCover: {
        height: 130,
        borderTopLeftRadius: Layout.radius.lg,
        borderTopRightRadius: Layout.radius.lg,
    },
    cardContent: { paddingTop: Layout.spacing.sm, paddingBottom: Layout.spacing.md },
    productName: { height: 38, color: Colors.text, lineHeight: 19 },
    price: { color: Colors.primary, fontWeight: 'bold' },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Layout.spacing.xs,
    },
    rating: { color: Colors.text, marginLeft: 2, marginRight: Layout.spacing.sm, fontWeight: '600' },
    category: { color: Colors.textTertiary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default EShopScreen;
