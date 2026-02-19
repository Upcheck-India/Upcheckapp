import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MockProductService, Product } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { EmptyState } from '../../components/EmptyState';

const BANNERS = [
    { id: '1', title: 'Up to 30% off', subtitle: 'Premium Aqua Feed', gradient: [Colors.gradientStart, Colors.gradientEnd] as any, icon: 'sale' },
    { id: '2', title: 'New Arrivals', subtitle: 'Probiotics & Minerals', gradient: [Colors.secondary, Colors.secondaryDark] as any, icon: 'new-box' },
    { id: '3', title: 'Free Shipping', subtitle: 'Orders over ₹2000', gradient: ['#FF6B6B', '#D32F2F'] as any, icon: 'truck-fast-outline' },
];

const SORT_OPTIONS = ['Relevant', 'Price: Low', 'Price: High', 'Top Rated'];

const getCategoryIcon = (cat: string) => ({ Feed: 'food', Minerals: 'atom', Probiotics: 'flask', Equipment: 'tools', All: 'view-grid' }[cat] ?? 'tag');

const getDiscount = (id: string) => ({ '1': 20, '2': 15, '4': 30 }[id] ?? 0);

const EShopScreen = () => {
    const navigation = useNavigation<any>();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('Relevant');
    const [cartCount, setCartCount] = useState(0);
    const [activeBanner, setActiveBanner] = useState(0);
    const categories = MockProductService.getCategories();

    useEffect(() => { loadProducts(); }, []);
    useEffect(() => { filterProducts(); }, [searchQuery, selectedCategory, sortBy, products]);

    const loadProducts = async () => {
        setLoading(true);
        try { setProducts(await MockProductService.getProducts()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filterProducts = () => {
        let filtered = products;
        if (selectedCategory !== 'All') filtered = filtered.filter(p => p.category === selectedCategory);
        if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (sortBy === 'Price: Low') filtered = [...filtered].sort((a, b) => a.price - b.price);
        else if (sortBy === 'Price: High') filtered = [...filtered].sort((a, b) => b.price - a.price);
        else if (sortBy === 'Top Rated') filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        setFilteredProducts(filtered);
    };

    const addToCart = (product: Product) => {
        setCartCount(c => c + 1);
    };

    const renderItem = ({ item }: { item: Product }) => {
        const discount = getDiscount(item.id);
        const originalPrice = discount ? Math.round(item.price / (1 - discount / 100)) : null;
        return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item, onAddToCart: addToCart })} activeOpacity={0.85}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                    {discount > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% OFF</Text></View>}
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.ratingRow}>
                        <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{item.rating} </Text>
                            <MaterialCommunityIcons name="star" size={10} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.price}>{item.currency}{item.price.toLocaleString()}</Text>
                    {originalPrice && <Text style={styles.originalPrice}>{item.currency}{originalPrice.toLocaleString()}</Text>}
                    <TouchableOpacity style={styles.addCartBtn} onPress={() => addToCart(item)}>
                        <MaterialCommunityIcons name="cart-plus" size={14} color="#fff" />
                        <Text style={styles.addCartText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <Searchbar placeholder="Search aqua products…" onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} inputStyle={styles.searchInput} iconColor={Colors.grey} elevation={0} />
                <TouchableOpacity style={styles.cartBtn} onPress={() => {}}>
                    <MaterialCommunityIcons name="cart-outline" size={26} color={Colors.text} />
                    {cartCount > 0 && <Badge style={styles.badge}>{cartCount}</Badge>}
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={styles.productList}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <>
                        {/* Banner */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={styles.bannerScroll}>
                            {BANNERS.map((b, i) => (
                                <LinearGradient key={b.id} colors={b.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
                                    <MaterialCommunityIcons name={b.icon as any} size={36} color="rgba(255,255,255,0.9)" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.bannerTitle}>{b.title}</Text>
                                        <Text style={styles.bannerSub}>{b.subtitle}</Text>
                                    </View>
                                </LinearGradient>
                            ))}
                        </ScrollView>

                        {/* Categories */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                            {categories.map(cat => (
                                <TouchableOpacity key={cat} style={[styles.catChip, selectedCategory === cat && styles.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                                    <MaterialCommunityIcons name={getCategoryIcon(cat) as any} size={16} color={selectedCategory === cat ? '#fff' : Colors.textSecondary} />
                                    <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Sort */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortList}>
                            {SORT_OPTIONS.map(s => (
                                <Chip key={s} selected={sortBy === s} onPress={() => setSortBy(s)} style={[styles.sortChip, sortBy === s && styles.sortChipActive]} textStyle={sortBy === s ? styles.sortChipTextActive : styles.sortChipText} compact showSelectedOverlay={false}>{s}</Chip>
                            ))}
                        </ScrollView>

                        <Text style={styles.resultsCount}>{filteredProducts.length} products</Text>
                    </>
                )}
                ListEmptyComponent={loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : <EmptyState icon="store-search-outline" title="No products found" subtitle={searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    searchBar: { flex: 1, marginRight: 8, backgroundColor: Colors.surfaceVariant, borderRadius: Layout.radius.md, height: 44 },
    searchInput: { fontSize: 13 },
    cartBtn: { position: 'relative', padding: 4 },
    badge: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.error, fontSize: 10 },
    bannerScroll: { marginVertical: 12 },
    banner: { width: 300, marginLeft: 16, borderRadius: Layout.radius.lg, padding: 20, flexDirection: 'row', alignItems: 'center', marginRight: 4 },
    bannerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
    categoryList: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Layout.radius.full, backgroundColor: Colors.surfaceVariant, gap: 6 },
    catChipActive: { backgroundColor: Colors.primary },
    catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    catTextActive: { color: '#fff', fontWeight: '700' },
    sortList: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
    sortChip: { backgroundColor: Colors.surfaceVariant },
    sortChipActive: { backgroundColor: Colors.primaryContainer },
    sortChipText: { color: Colors.textSecondary, fontSize: 12 },
    sortChipTextActive: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
    resultsCount: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, color: Colors.textTertiary },
    productList: { paddingHorizontal: 8, paddingBottom: 24 },
    row: { justifyContent: 'space-between', paddingHorizontal: 4 },
    card: { width: '48%', marginBottom: 12, backgroundColor: Colors.cardBackground, borderRadius: Layout.radius.lg, overflow: 'hidden', ...Layout.shadow.sm },
    imageContainer: { position: 'relative' },
    productImage: { width: '100%', height: 140, resizeMode: 'cover' },
    discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    cardBody: { padding: 10 },
    productName: { fontSize: 13, color: Colors.text, lineHeight: 18, height: 36, marginBottom: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
    ratingText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    price: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 1 },
    originalPrice: { fontSize: 11, color: Colors.textTertiary, textDecorationLine: 'line-through', marginBottom: 6 },
    addCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Layout.radius.sm, paddingVertical: 5, gap: 4 },
    addCartText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default EShopScreen;
