import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Searchbar, Chip, Card, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MockProductService, Product } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';

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
        <Card style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
            <Card.Cover source={{ uri: item.imageUrl }} style={styles.cardCover} />
            <Card.Content style={styles.cardContent}>
                <Text variant="titleSmall" style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text variant="titleMedium" style={{ color: Colors.primary, fontWeight: 'bold' }}>
                    {item.currency}{item.price}
                </Text>
                <Text variant="bodySmall" style={styles.category}>{item.category}</Text>
            </Card.Content>
            <Card.Actions>
                <Button mode="contained-tonal" style={{ width: '100%' }}>View</Button>
            </Card.Actions>
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
                            style={styles.chip}
                            showSelectedOverlay
                        >
                            {item}
                        </Chip>
                    )}
                />
            </View>

            {loading ? (
                <View style={[styles.center, { marginTop: 40 }]}><ActivityIndicator /></View>
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
    header: { backgroundColor: Colors.surface, paddingBottom: 12, elevation: 2 },
    searchBar: { margin: 16, backgroundColor: Colors.lightGrey },
    categoryList: { paddingHorizontal: 16 },
    chip: { marginRight: 8 },
    productList: { padding: 12 },
    row: { justifyContent: 'space-between' },
    card: { width: '48%', marginBottom: 12, backgroundColor: Colors.surface },
    cardCover: { height: 120 },
    cardContent: { paddingTop: 8 },
    productName: { height: 40, color: Colors.text },
    category: { color: Colors.textSecondary, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default EShopScreen;
