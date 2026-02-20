import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Share } from 'react-native';
import { Text, Divider, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Product } from '../../services/mockProductService';
import { useCart } from '../../context/CartContext';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { GradientButton } from '../../components/GradientButton';

const ProductDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { addItem } = useCart();
    const product: Product = route.params?.product;
    const [qty, setQty] = useState(1);
    const [snackVisible, setSnackVisible] = useState(false);
    const [specTab, setSpecTab] = useState<'product' | 'general'>('product');

    if (!product) return null;

    const discount = product.discount ?? 0;
    const originalPrice = discount ? Math.round(product.price / (1 - discount / 100)) : null;
    const activeSpecs = specTab === 'product' ? product.productSpecs : product.universalSpecs;

    const handleAddToCart = () => {
        if (!product.inStock) return;
        addItem(product, qty);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSnackVisible(true);
    };

    const handleShare = async () => {
        const productUrl = `upcheckapp://product/${product.id}`;
        await Share.share({
            message: `Check out ${product.name} – ${product.currency}${product.price.toLocaleString()} on UpCheck Aqua Shop!\n\nOpen in the app: ${productUrl}`,
            title: product.name,
        });
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
                    <View style={styles.tagRow}>
                        <View style={styles.catTag}><Text style={styles.catTagText}>{product.category}</Text></View>
                        <View style={styles.unitTag}><Text style={styles.unitTagText}>{product.unit}</Text></View>
                    </View>

                    <Text style={styles.title}>{product.name}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{product.rating}</Text>
                            <MaterialCommunityIcons name="star" size={12} color="#fff" />
                        </View>
                        <Text style={styles.metaText}>{product.reviewCount} reviews · </Text>
                        <Text style={[styles.metaText, { color: product.inStock ? Colors.success : Colors.error, fontWeight: '600' }]}>
                            {product.inStock ? (product.stockQty && product.stockQty < 20 ? `Only ${product.stockQty} left!` : 'In Stock') : 'Out of Stock'}
                        </Text>
                        {product.inStock && product.deliveryUnavailable && (
                            <View style={styles.deliveryUnavailableBadge}>
                                <MaterialCommunityIcons name="map-marker-off" size={11} color={Colors.warning} />
                                <Text style={styles.deliveryUnavailableText}>Not deliverable to your location</Text>
                            </View>
                        )}
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

                    {/* Seller */}
                    <Text style={styles.sectionTitle}>Sold By</Text>
                    <View style={styles.sellerCard}>
                        <View style={styles.sellerAvatar}>
                            <MaterialCommunityIcons name="store" size={22} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.sellerName}>{product.seller.name}</Text>
                                {product.seller.verified && <MaterialCommunityIcons name="check-decagram" size={15} color={Colors.primary} style={{ marginLeft: 4 }} />}
                            </View>
                            <Text style={styles.sellerMeta}><MaterialCommunityIcons name="star" size={11} color="#FFA000" /> {product.seller.rating}  ·  {product.seller.totalSales.toLocaleString()} sales  ·  {product.seller.location}</Text>
                            <Text style={styles.sellerMeta}><MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textTertiary} /> Responds {product.seller.responseTime}  ·  Since {product.seller.since}</Text>
                        </View>
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
                    <Text style={styles.sectionTitle}>Specifications</Text>
                    <View style={styles.specTabRow}>
                        {(['product', 'general'] as const).map(tab => (
                            <TouchableOpacity key={tab} style={[styles.specTab, specTab === tab && styles.specTabActive]} onPress={() => setSpecTab(tab)}>
                                <Text style={[styles.specTabText, specTab === tab && styles.specTabTextActive]}>{tab === 'product' ? 'Product Specs' : 'General Info'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.specsGrid}>
                        {activeSpecs.map(s => (
                            <View key={s.label} style={styles.specItem}>
                                <Text style={styles.specLabel}>{s.label}</Text>
                                <Text style={styles.specValue}>{s.value}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Delivery info */}
                    <View style={styles.deliveryBox}>
                        <MaterialCommunityIcons name="truck-fast-outline" size={20} color={Colors.primary} />
                        <Text style={styles.deliveryText}>Free delivery on orders over ₹2000 · Dispatched within 2 days</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {!product.inStock && (
                    <View style={styles.oosBanner}>
                        <MaterialCommunityIcons name="cart-off" size={18} color={Colors.textSecondary} />
                        <Text style={styles.oosText}>Out of Stock — Currently Unavailable</Text>
                    </View>
                )}
                {product.inStock && product.deliveryUnavailable && (
                    <View style={styles.deliveryUnavailableFooter}>
                        <MaterialCommunityIcons name="map-marker-off" size={18} color={Colors.warning} />
                        <Text style={styles.deliveryUnavailableFooterText}>Delivery not available at your location</Text>
                    </View>
                )}
                {product.inStock && !product.deliveryUnavailable && (
                    <GradientButton
                        title={`Add ${qty > 1 ? qty + '× ' : ''}to Cart — ${product.currency}${(product.price * qty).toLocaleString()}`}
                        icon="cart-plus"
                        onPress={handleAddToCart}
                    />
                )}
            </View>

            <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2200} style={{ backgroundColor: Colors.success }}>
                {qty > 1 ? `${qty}× ` : ''}{product.name} added to cart!
            </Snackbar>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    content: { paddingBottom: 110 },
    imageContainer: { position: 'relative' },
    image: { width: '100%', height: 280, resizeMode: 'cover' },
    discountBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    discountText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    shareBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.92)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    details: { padding: Layout.spacing.xl },
    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    catTag: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Layout.radius.full },
    catTagText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
    unitTag: { backgroundColor: Colors.surfaceVariant, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Layout.radius.full },
    unitTagText: { color: Colors.textSecondary, fontSize: 12 },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8, lineHeight: 26 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, gap: 2 },
    ratingText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    metaText: { color: Colors.textSecondary, fontSize: 13 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
    price: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
    originalPrice: { fontSize: 16, color: Colors.textTertiary, textDecorationLine: 'line-through' },
    saveBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    saveText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
    divider: { marginVertical: Layout.spacing.lg },
    sellerCard: { flexDirection: 'row', backgroundColor: Colors.surfaceVariant, padding: 12, borderRadius: Layout.radius.lg, gap: 12, marginBottom: 4 },
    sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    sellerName: { fontSize: 14, fontWeight: '700', color: Colors.text },
    sellerMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtyLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
    qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
    qtyValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text, minWidth: 30, textAlign: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 10 },
    description: { color: Colors.textSecondary, lineHeight: 22, marginBottom: Layout.spacing.lg },
    specTabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    specTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Layout.radius.full, backgroundColor: Colors.surfaceVariant },
    specTabActive: { backgroundColor: Colors.primary },
    specTabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
    specTabTextActive: { color: '#fff' },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Layout.spacing.lg },
    specItem: { width: '47%', backgroundColor: Colors.surfaceVariant, padding: 10, borderRadius: Layout.radius.md },
    specLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
    specValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
    deliveryBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.primaryContainer, padding: 12, borderRadius: Layout.radius.md, gap: 10 },
    deliveryText: { flex: 1, color: Colors.primary, fontSize: 13, lineHeight: 18 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Layout.spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider, ...Layout.shadow.xl },
    oosBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: Colors.surfaceVariant, borderRadius: Layout.radius.md },
    oosText: { color: Colors.textSecondary, fontSize: 13 },
    deliveryUnavailableBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warningLight ?? '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Layout.radius.full },
    deliveryUnavailableText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
    deliveryUnavailableFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#FFF3E0', borderRadius: Layout.radius.md },
    deliveryUnavailableFooterText: { color: Colors.warning, fontSize: 13, fontWeight: '600' },
});

export default ProductDetailScreen;
