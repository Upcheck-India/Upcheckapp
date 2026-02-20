import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCart } from '../../context/CartContext';
import { MockProductService, Coupon } from '../../services/mockProductService';
import { GradientButton } from '../../components/GradientButton';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const DEFAULT_ADDRESS = 'Farm Plot 14, Aqua Zone, Nellore, AP – 524002';

const AVAILABLE_COUPONS = [
    { code: 'AQUA10', description: '10% off · Min ₹500' },
    { code: 'SAVE200', description: '₹200 off · Min ₹2000' },
    { code: 'FIRST15', description: '15% off · Min ₹300' },
];

const CheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const { items, subtotal, coupon, setCoupon, clearCart } = useCart();

    const [address, setAddress] = useState(DEFAULT_ADDRESS);
    const [couponInput, setCouponInput] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponApplied, setCouponApplied] = useState<Coupon | null>(coupon);
    const [placing, setPlacing] = useState(false);

    const deliveryFee = subtotal >= 2000 ? 0 : 149;
    const discountAmt = couponApplied ? MockProductService.calculateDiscount(couponApplied, subtotal) : 0;
    const total = subtotal - discountAmt + deliveryFee;

    const handleApplyCoupon = () => {
        setCouponError('');
        const raw = couponInput.trim().toUpperCase();
        if (!raw) { setCouponError('Enter a coupon code'); return; }

        const c = MockProductService.applyCoupon(raw, subtotal);
        if (!c) {
            const known = AVAILABLE_COUPONS.find(cp => cp.code === raw);
            if (known) {
                setCouponError(`Min. order required for ${raw} — add more items`);
            } else {
                setCouponError(`"${raw}" is not a valid coupon code`);
            }
            setCouponApplied(null);
            setCoupon(null);
            return;
        }
        setCouponApplied(c);
        setCoupon(c);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleRemoveCoupon = () => {
        setCouponApplied(null);
        setCoupon(null);
        setCouponInput('');
        setCouponError('');
    };

    const handlePlaceOrder = async () => {
        setPlacing(true);
        try {
            const order = await MockProductService.placeOrder(items, couponApplied, address);
            clearCart();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.replace('OrderDetail', { order });
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setPlacing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Delivery Address */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Delivery Address</Text>
                    </View>
                    <RNTextInput
                        style={styles.addressInput}
                        value={address}
                        onChangeText={setAddress}
                        multiline
                        numberOfLines={2}
                        placeholder="Enter delivery address"
                        placeholderTextColor={Colors.textTertiary}
                    />
                </View>

                {/* Coupon */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="tag-outline" size={18} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Coupon Code</Text>
                    </View>

                    {couponApplied ? (
                        <View style={styles.couponApplied}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.couponAppliedCode}>{couponApplied.code}</Text>
                                <Text style={styles.couponAppliedDesc}>{couponApplied.description}</Text>
                            </View>
                            <TouchableOpacity onPress={handleRemoveCoupon}>
                                <MaterialCommunityIcons name="close-circle" size={22} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.couponInputRow}>
                                <RNTextInput
                                    style={styles.couponInput}
                                    value={couponInput}
                                    onChangeText={text => { setCouponInput(text.toUpperCase()); setCouponError(''); }}
                                    placeholder="Enter coupon code"
                                    placeholderTextColor={Colors.textTertiary}
                                    autoCapitalize="characters"
                                />
                                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
                                    <Text style={styles.applyBtnText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                            {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}

                            <Text style={styles.availableLabel}>Available Coupons</Text>
                            {AVAILABLE_COUPONS.map(cp => (
                                <TouchableOpacity key={cp.code} style={styles.couponSuggestion} onPress={() => setCouponInput(cp.code)}>
                                    <MaterialCommunityIcons name="ticket-percent-outline" size={16} color={Colors.primary} />
                                    <View>
                                        <Text style={styles.couponSuggCode}>{cp.code}</Text>
                                        <Text style={styles.couponSuggDesc}>{cp.description}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </View>

                {/* Order Items */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="cart-outline" size={18} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Order Items ({items.length})</Text>
                    </View>
                    {items.map(ci => (
                        <View key={ci.product.id} style={styles.orderItem}>
                            <Text style={styles.orderItemName} numberOfLines={1}>{ci.product.name}</Text>
                            <Text style={styles.orderItemQty}>{ci.qty} × {ci.product.currency}{ci.product.price.toLocaleString()}</Text>
                            <Text style={styles.orderItemTotal}>{ci.product.currency}{(ci.product.price * ci.qty).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Price Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="receipt" size={18} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Price Breakdown</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                        <Text style={styles.breakdownValue}>₹{subtotal.toLocaleString()}</Text>
                    </View>
                    {discountAmt > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: Colors.success }]}>
                                Coupon ({couponApplied?.code})
                            </Text>
                            <Text style={[styles.breakdownValue, { color: Colors.success }]}>− ₹{discountAmt.toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Delivery</Text>
                        <Text style={[styles.breakdownValue, deliveryFee === 0 && { color: Colors.success }]}>
                            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                        </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>GST (18%)</Text>
                        <Text style={styles.breakdownValue}>Included</Text>
                    </View>
                    <Divider style={{ marginVertical: 10 }} />
                    <View style={styles.breakdownRow}>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
                    </View>
                    {discountAmt > 0 && (
                        <Text style={styles.savingsText}>
                            <MaterialCommunityIcons name="piggy-bank-outline" size={13} color={Colors.success} /> You save ₹{discountAmt.toLocaleString()} on this order!
                        </Text>
                    )}
                </View>

                {/* Payment Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="credit-card-outline" size={18} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Payment</Text>
                    </View>
                    <View style={styles.paymentRow}>
                        <MaterialCommunityIcons name="cash" size={20} color={Colors.textSecondary} />
                        <Text style={styles.paymentText}>Cash on Delivery (COD)</Text>
                        <View style={styles.paymentBadge}><Text style={styles.paymentBadgeText}>Selected</Text></View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {placing
                    ? <ActivityIndicator color={Colors.primary} />
                    : <GradientButton
                        title={`Place Order — ₹${total.toLocaleString()}`}
                        icon="check-circle"
                        onPress={handlePlaceOrder}
                        disabled={!address.trim()}
                    />
                }
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
    scroll: { paddingBottom: 110 },
    section: { backgroundColor: Colors.surface, marginTop: 10, padding: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
    addressInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius.md, padding: 10, color: Colors.text, fontSize: 14, lineHeight: 20, minHeight: 56 },
    couponInputRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    couponInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text, letterSpacing: 1 },
    applyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, borderRadius: Layout.radius.md, alignItems: 'center', justifyContent: 'center' },
    applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    couponError: { color: Colors.error, fontSize: 12, marginBottom: 8 },
    couponApplied: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successLight, padding: 12, borderRadius: Layout.radius.md, gap: 10 },
    couponAppliedCode: { fontWeight: '700', color: Colors.success, fontSize: 14 },
    couponAppliedDesc: { color: Colors.textSecondary, fontSize: 12 },
    availableLabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
    couponSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    couponSuggCode: { fontWeight: '700', color: Colors.primary, fontSize: 13 },
    couponSuggDesc: { fontSize: 12, color: Colors.textSecondary },
    orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
    orderItemName: { flex: 1, fontSize: 13, color: Colors.text },
    orderItemQty: { fontSize: 12, color: Colors.textSecondary },
    orderItemTotal: { fontSize: 13, fontWeight: '600', color: Colors.text, minWidth: 60, textAlign: 'right' },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    breakdownLabel: { fontSize: 14, color: Colors.textSecondary },
    breakdownValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
    totalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
    savingsText: { fontSize: 12, color: Colors.success, marginTop: 6 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    paymentText: { flex: 1, fontSize: 14, color: Colors.text },
    paymentBadge: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    paymentBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider, ...Layout.shadow.xl },
});

export default CheckoutScreen;
