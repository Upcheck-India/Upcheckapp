import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Share } from 'react-native';
import { Text, Divider, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Product } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { GradientButton } from '../../components/GradientButton';

const SPECS: Record<string, { label: string; value: string }[]> = {
    Feed: [{ label: 'Protein', value: '40%' }, { label: 'Fat', value: '8%' }, { label: 'Moisture', value: '≤12%' }, { label: 'Form', value: 'Pellet' }],
    Minerals: [{ label: 'Purity', value: '≥98%' }, { label: 'Mesh Size', value: '100 mesh' }, { label: 'pH', value: '8.5–9.5' }, { label: 'Origin', value: 'Natural' }],
    Probiotics: [{ label: 'CFU/g', value: '1 × 10⁹' }, { label: 'Strains', value: '5 species' }, { label: 'Shelf Life', value: '18 months' }, { label: 'Storage', value: 'Cool & dry' }],
    Equipment: [{ label: 'Power', value: '2 HP' }, { label: 'Voltage', value: '220V AC' }, { label: 'Material', value: 'SS 304' }, { label: 'Warranty', value: '1 year' }],
};

const getDiscount = (id: string) => ({ '1': 20, '2': 15, '4': 30 }[id] ?? 0);

const ProductDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const product: Product = route.params?.product;
    const [qty, setQty] = useState(1);
    const [snackVisible, setSnackVisible] = useState(false);

    if (!product) return null;

    const discount = getDiscount(product.id);
    const originalPrice = discount ? Math.round(product.price / (1 - discount / 100)) : null;
    const specs = SPECS[product.category] ?? [];

    const handleAddToCart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        route.params?.onAddToCart?.(product);
        setSnackVisible(true);
    };

    const handleShare = async () => {
        await Share.share({ message: `Check out ${product.name} – ${product.currency}${product.price} on UpCheck Aqua Shop!` });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: product.imageUrl }} style={styles.image} />
                    {discount > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% OFF</Text></View>}
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <MaterialCommunityIcons name="share-variant" size={20} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.details}>
                    {/* Category tag */}
                    <View style={styles.catTag}>
                        <Text style={styles.catTagText}>{product.category}</Text>
                    </View>

                    <Text style={styles.title}>{product.name}</Text>

                    {/* Rating row */}
                    <View style={styles.metaRow}>
                        <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{product.rating}</Text>
                            <MaterialCommunityIcons name="star" size={12} color="#fff" />
                        </View>
                        <Text style={styles.metaText}>Aquaculture Grade · In Stock</Text>
                    </View>

                    {/* Price */}
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{product.currency}{product.price.toLocaleString()}</Text>
                        {originalPrice && (
                            <>
                                <Text style={styles.originalPrice}>{product.currency}{originalPrice.toLocaleString()}</Text>
                                <View style={styles.saveBadge}><Text style={styles.saveText}>Save {product.currency}{(originalPrice - product.price).toLocaleString()}</Text></View>
                            </>
                        )}
                    </View>

                    <Divider style={styles.divider} />

                    {/* Quantity */}
                    <View style={styles.qtyRow}>
                        <Text style={styles.qtyLabel}>Quantity</Text>
                        <View style={styles.qtyStepper}>
                            <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} style={styles.qtyBtn}>
                                <MaterialCommunityIcons name="minus" size={16} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.qtyValue}>{qty}</Text>
                            <TouchableOpacity onPress={() => setQty(q => q + 1)} style={styles.qtyBtn}>
                                <MaterialCommunityIcons name="plus" size={16} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{product.description}</Text>

                    {/* Specs */}
                    {specs.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Specifications</Text>
                            <View style={styles.specsGrid}>
                                {specs.map(s => (
                                    <View key={s.label} style={styles.specItem}>
                                        <Text style={styles.specLabel}>{s.label}</Text>
                                        <Text style={styles.specValue}>{s.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Delivery info */}
                    <View style={styles.deliveryBox}>
                        <MaterialCommunityIcons name="truck-fast-outline" size={20} color={Colors.primary} />
                        <Text style={styles.deliveryText}>Free delivery on orders over ₹2000 · Dispatched within 2 days</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <GradientButton title={`Add ${qty} to Cart — ${product.currency}${(product.price * qty).toLocaleString()}`} icon="cart-plus" onPress={handleAddToCart} />
            </View>

            <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2500} style={{ backgroundColor: Colors.success }}>
                {product.name} added to cart!
            </Snackbar>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    content: { paddingBottom: 100 },
    imageContainer: { position: 'relative' },
    image: { width: '100%', height: 280, resizeMode: 'cover' },
    discountBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    discountText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    shareBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    details: { padding: Layout.spacing.xl },
    catTag: { backgroundColor: Colors.primaryContainer, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Layout.radius.full, marginBottom: 8 },
    catTagText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8, lineHeight: 26 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, gap: 2 },
    ratingText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    metaText: { color: Colors.textSecondary, fontSize: 13 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    price: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
    originalPrice: { fontSize: 16, color: Colors.textTertiary, textDecorationLine: 'line-through' },
    saveBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    saveText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
    divider: { marginVertical: Layout.spacing.lg },
    qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtyLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
    qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
    qtyValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text, minWidth: 30, textAlign: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
    description: { color: Colors.textSecondary, lineHeight: 22, marginBottom: Layout.spacing.lg },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Layout.spacing.lg },
    specItem: { width: '47%', backgroundColor: Colors.surfaceVariant, padding: 10, borderRadius: Layout.radius.md },
    specLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
    specValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    deliveryBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.primaryContainer, padding: 12, borderRadius: Layout.radius.md, gap: 10 },
    deliveryText: { flex: 1, color: Colors.primary, fontSize: 13, lineHeight: 18 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Layout.spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider, ...Layout.shadow.xl },
});

export default ProductDetailScreen;
