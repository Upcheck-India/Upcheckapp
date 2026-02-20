import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCart } from '../../context/CartContext';
import { CartItem } from '../../services/mockProductService';
import { GradientButton } from '../../components/GradientButton';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const CartScreen = () => {
    const navigation = useNavigation<any>();
    const { items, removeItem, updateQty, subtotal, clearCart } = useCart();

    const deliveryFee = subtotal >= 2000 ? 0 : 149;

    const renderItem = ({ item }: { item: CartItem }) => (
        <View style={styles.cartItem}>
            <Image source={{ uri: item.product.imageUrl }} style={styles.thumb} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.itemUnit}>{item.product.unit}</Text>
                <Text style={styles.itemSeller}>{item.product.seller.name}</Text>
                <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>
                        {item.product.currency}{(item.product.price * item.qty).toLocaleString()}
                    </Text>
                    <View style={styles.qtyStepper}>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => { updateQty(item.product.id, item.qty - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                            <MaterialCommunityIcons name={item.qty === 1 ? 'trash-can-outline' : 'minus'} size={14} color={item.qty === 1 ? Colors.error : Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.qty}</Text>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => { updateQty(item.product.id, item.qty + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                            <MaterialCommunityIcons name="plus" size={14} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    if (items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cart</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="cart-outline" size={72} color={Colors.lightGrey} />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Add products from the shop to continue</Text>
                    <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.shopBtnText}>Browse Products</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cart ({items.length})</Text>
                <TouchableOpacity onPress={() => { clearCart(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }}>
                    <Text style={styles.clearBtn}>Clear</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={ci => ci.product.id}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <Divider />}
                contentContainerStyle={styles.list}
                ListFooterComponent={() => (
                    <View style={styles.summary}>
                        <Text style={styles.summaryTitle}>Price Summary</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal ({items.reduce((s, ci) => s + ci.qty, 0)} items)</Text>
                            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery</Text>
                            <Text style={[styles.summaryValue, deliveryFee === 0 && { color: Colors.success }]}>
                                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                            </Text>
                        </View>
                        {deliveryFee > 0 && (
                            <Text style={styles.freeShipHint}>Add ₹{(2000 - subtotal).toLocaleString()} more for free delivery</Text>
                        )}
                        <Divider style={{ marginVertical: 10 }} />
                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₹{(subtotal + deliveryFee).toLocaleString()}</Text>
                        </View>
                        <Text style={styles.couponHint}>
                            <MaterialCommunityIcons name="tag-outline" size={13} color={Colors.primary} /> Apply coupon codes at checkout for extra savings
                        </Text>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <GradientButton
                    title={`Proceed to Checkout — ₹${(subtotal + deliveryFee).toLocaleString()}`}
                    icon="arrow-right"
                    onPress={() => navigation.navigate('Checkout')}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
    clearBtn: { color: Colors.error, fontSize: 14, fontWeight: '600' },
    list: { paddingBottom: 120 },
    cartItem: { flexDirection: 'row', padding: 14, backgroundColor: Colors.surface, gap: 12 },
    thumb: { width: 72, height: 72, borderRadius: Layout.radius.md, resizeMode: 'cover' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 19 },
    itemUnit: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
    itemSeller: { fontSize: 11, color: Colors.primary, marginTop: 2 },
    itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    itemPrice: { fontSize: 15, fontWeight: '700', color: Colors.text },
    qtyStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceVariant, borderRadius: Layout.radius.sm, overflow: 'hidden' },
    qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    qtyValue: { fontSize: 14, fontWeight: '700', color: Colors.text, paddingHorizontal: 8 },
    summary: { margin: 16, backgroundColor: Colors.surface, borderRadius: Layout.radius.lg, padding: 16, ...Layout.shadow.sm },
    summaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, color: Colors.textSecondary },
    summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    freeShipHint: { fontSize: 11, color: Colors.warning, marginBottom: 4 },
    totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
    totalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
    couponHint: { fontSize: 12, color: Colors.primary, marginTop: 8 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider, ...Layout.shadow.xl },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
    shopBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Layout.radius.lg },
    shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default CartScreen;
