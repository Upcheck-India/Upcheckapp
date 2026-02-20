import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Order, OrderStatus } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const TRACKING_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'placed',           label: 'Order Placed',       icon: 'check-circle-outline' },
    { status: 'confirmed',        label: 'Confirmed',           icon: 'clipboard-check-outline' },
    { status: 'packed',           label: 'Packed',              icon: 'package-variant' },
    { status: 'shipped',          label: 'Shipped',             icon: 'truck-outline' },
    { status: 'out_for_delivery', label: 'Out for Delivery',   icon: 'truck-delivery-outline' },
    { status: 'delivered',        label: 'Delivered',           icon: 'check-decagram' },
];

const STATUS_ORDER = TRACKING_STEPS.map(s => s.status);

const PAYMENT_LABELS: Record<string, string> = {
    cod:   'Cash on Delivery',
    upi:   'UPI',
    gpay:  'Google Pay',
    paytm: 'Paytm',
};

const OrderDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const order: Order = route.params?.order;

    if (!order) return null;

    const currentIdx = order.status === 'cancelled' ? -1 : STATUS_ORDER.indexOf(order.status);
    const isNew = navigation.canGoBack() && route.params?._isNew;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Orders')}
                    style={styles.backBtn}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.id}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Success Banner (shown for freshly placed orders) */}
                {order.status === 'placed' && (
                    <View style={styles.successBanner}>
                        <MaterialCommunityIcons name="check-circle" size={40} color={Colors.success} />
                        <Text style={styles.successTitle}>Order Placed Successfully!</Text>
                        <Text style={styles.successSubtitle}>
                            Thank you for your order. We'll confirm it shortly.
                        </Text>
                    </View>
                )}

                {/* Cancelled Banner */}
                {order.status === 'cancelled' && (
                    <View style={styles.cancelledBanner}>
                        <MaterialCommunityIcons name="close-circle" size={36} color={Colors.error} />
                        <Text style={styles.cancelledText}>This order has been cancelled</Text>
                    </View>
                )}

                {/* Tracking Timeline */}
                {order.status !== 'cancelled' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Order Tracking</Text>
                        {order.trackingId && (
                            <View style={styles.trackingIdRow}>
                                <MaterialCommunityIcons name="barcode-scan" size={15} color={Colors.primary} />
                                <Text style={styles.trackingId}>Tracking ID: {order.trackingId}</Text>
                            </View>
                        )}
                        <View style={styles.timeline}>
                            {TRACKING_STEPS.map((step, i) => {
                                const done = i <= currentIdx;
                                const active = i === currentIdx;
                                return (
                                    <View key={step.status} style={styles.timelineRow}>
                                        <View style={styles.timelineLeft}>
                                            <View style={[
                                                styles.timelineDot,
                                                done && styles.timelineDotDone,
                                                active && styles.timelineDotActive,
                                            ]}>
                                                <MaterialCommunityIcons
                                                    name={done ? 'check' : step.icon as any}
                                                    size={done ? 12 : 14}
                                                    color={done ? '#fff' : Colors.lightGrey}
                                                />
                                            </View>
                                            {i < TRACKING_STEPS.length - 1 && (
                                                <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                                            )}
                                        </View>
                                        <View style={styles.timelineContent}>
                                            <Text style={[
                                                styles.timelineLabel,
                                                active && { color: Colors.primary, fontWeight: '700' },
                                                !done && !active && { color: Colors.textTertiary },
                                            ]}>
                                                {step.label}
                                            </Text>
                                            {active && (
                                                <Text style={styles.timelineActiveNote}>
                                                    {step.status === 'placed' ? `Est. delivery by ${new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'In progress…'}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Delivery Address */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Delivery Address</Text>
                    </View>
                    <Text style={styles.address}>{order.address}</Text>
                </View>

                {/* Order Items */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <MaterialCommunityIcons name="cart-outline" size={16} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Items Ordered</Text>
                    </View>
                    {order.items.map(oi => (
                        <View key={oi.product.id} style={styles.orderItem}>
                            <Text style={styles.orderItemName} numberOfLines={1}>{oi.product.name}</Text>
                            <Text style={styles.orderItemQty}>{oi.qty} × ₹{oi.price.toLocaleString()}</Text>
                            <Text style={styles.orderItemTotal}>₹{(oi.price * oi.qty).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Price Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <MaterialCommunityIcons name="receipt" size={16} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Price Details</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Subtotal</Text>
                        <Text style={styles.priceValue}>₹{order.subtotal.toLocaleString()}</Text>
                    </View>
                    {order.discount > 0 && (
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceLabel, { color: Colors.success }]}>
                                Coupon {order.couponCode ? `(${order.couponCode})` : ''}
                            </Text>
                            <Text style={[styles.priceValue, { color: Colors.success }]}>− ₹{order.discount.toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Delivery</Text>
                        <Text style={[styles.priceValue, order.deliveryFee === 0 && { color: Colors.success }]}>
                            {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                        </Text>
                    </View>
                    {order.gst > 0 && (
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>GST (18%)</Text>
                            <Text style={styles.priceValue}>₹{order.gst.toFixed(2)}</Text>
                        </View>
                    )}
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalValue}>₹{order.total.toLocaleString()}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Payment Method</Text>
                        <Text style={styles.priceValue}>{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Text>
                    </View>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
    scroll: { paddingBottom: 40 },
    successBanner: { backgroundColor: Colors.successLight, alignItems: 'center', padding: 24, marginBottom: 4 },
    successTitle: { fontSize: 18, fontWeight: '700', color: Colors.success, marginTop: 10 },
    successSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
    cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, padding: 16, marginBottom: 4 },
    cancelledText: { fontSize: 14, fontWeight: '600', color: Colors.error },
    section: { backgroundColor: Colors.surface, padding: 16, marginTop: 8 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
    trackingIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, backgroundColor: Colors.primaryContainer, padding: 8, borderRadius: Layout.radius.md },
    trackingId: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
    timeline: { paddingLeft: 4 },
    timelineRow: { flexDirection: 'row', gap: 14 },
    timelineLeft: { alignItems: 'center', width: 28 },
    timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.lightGrey },
    timelineDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    timelineDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight, borderWidth: 3 },
    timelineLine: { width: 2, flex: 1, backgroundColor: Colors.lightGrey, marginVertical: 3, minHeight: 18 },
    timelineLineDone: { backgroundColor: Colors.primary },
    timelineContent: { flex: 1, paddingBottom: 16 },
    timelineLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
    timelineActiveNote: { fontSize: 12, color: Colors.primary, marginTop: 2 },
    address: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
    orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    orderItemName: { flex: 1, fontSize: 13, color: Colors.text },
    orderItemQty: { fontSize: 12, color: Colors.textSecondary },
    orderItemTotal: { fontSize: 13, fontWeight: '600', color: Colors.text, minWidth: 60, textAlign: 'right' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    priceLabel: { fontSize: 14, color: Colors.textSecondary },
    priceValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
    totalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});

export default OrderDetailScreen;
