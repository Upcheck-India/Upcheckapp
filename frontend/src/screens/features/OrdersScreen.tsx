import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MockProductService, Order, OrderStatus } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: string; color: string }> = {
    placed:            { label: 'Order Placed',       icon: 'check-circle-outline',       color: Colors.info },
    confirmed:         { label: 'Confirmed',           icon: 'clipboard-check-outline',    color: Colors.primary },
    packed:            { label: 'Packed',              icon: 'package-variant',             color: Colors.secondary },
    shipped:           { label: 'Shipped',             icon: 'truck-outline',               color: Colors.warning },
    out_for_delivery:  { label: 'Out for Delivery',   icon: 'truck-delivery-outline',      color: Colors.warning },
    delivered:         { label: 'Delivered',           icon: 'check-decagram',              color: Colors.success },
    cancelled:         { label: 'Cancelled',           icon: 'close-circle-outline',        color: Colors.error },
};

const TRACKING_STEPS: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

const OrdersScreen = () => {
    const navigation = useNavigation<any>();
    const [orders, setOrders] = useState<Order[]>([]);

    useFocusEffect(useCallback(() => {
        setOrders(MockProductService.getOrders());
    }, []));

    const handleCancel = (order: Order) => {
        Alert.alert(
            'Cancel Order',
            `Cancel order ${order.id}? This action cannot be undone.`,
            [
                { text: 'Keep Order', style: 'cancel' },
                {
                    text: 'Cancel Order', style: 'destructive',
                    onPress: () => {
                        const ok = MockProductService.cancelOrder(order.id);
                        if (ok) {
                            setOrders(MockProductService.getOrders());
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        } else {
                            Alert.alert('Cannot Cancel', 'This order cannot be cancelled at its current stage.');
                        }
                    },
                },
            ]
        );
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const cfg = STATUS_CONFIG[item.status];
        const canCancel = !['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(item.status);
        const stepIdx = TRACKING_STEPS.indexOf(item.status);

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
                activeOpacity={0.85}
            >
                {/* Order Header */}
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderId}>Order #{item.id}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(item.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                        <MaterialCommunityIcons name={cfg.icon as any} size={13} color={cfg.color} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                {/* Tracking Bar */}
                {item.status !== 'cancelled' && (
                    <View style={styles.trackingBar}>
                        {TRACKING_STEPS.map((step, i) => (
                            <View key={step} style={styles.trackingStep}>
                                <View style={[
                                    styles.trackingDot,
                                    i <= stepIdx && { backgroundColor: Colors.primary },
                                ]}>
                                    {i < stepIdx && <MaterialCommunityIcons name="check" size={8} color="#fff" />}
                                </View>
                                {i < TRACKING_STEPS.length - 1 && (
                                    <View style={[styles.trackingLine, i < stepIdx && { backgroundColor: Colors.primary }]} />
                                )}
                            </View>
                        ))}
                    </View>
                )}

                <Divider style={{ marginVertical: 10 }} />

                {/* Items Preview */}
                <Text style={styles.itemsPreview} numberOfLines={2}>
                    {item.items.map(oi => `${oi.qty}× ${oi.product.name}`).join('  ·  ')}
                </Text>

                {/* Footer */}
                <View style={styles.orderFooter}>
                    <View>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₹{item.total.toLocaleString()}</Text>
                    </View>
                    <View style={styles.actionRow}>
                        {item.trackingId && item.status !== 'cancelled' && (
                            <View style={styles.trackingIdBadge}>
                                <MaterialCommunityIcons name="barcode-scan" size={12} color={Colors.primary} />
                                <Text style={styles.trackingIdText}>{item.trackingId}</Text>
                            </View>
                        )}
                        {canCancel && (
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => handleCancel(item)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ETA */}
                {item.status !== 'cancelled' && item.status !== 'delivered' && (
                    <View style={styles.etaRow}>
                        <MaterialCommunityIcons name="calendar-clock" size={13} color={Colors.textTertiary} />
                        <Text style={styles.etaText}>
                            Est. delivery: {new Date(item.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={orders}
                keyExtractor={o => o.id}
                renderItem={renderOrder}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="package-variant-closed" size={72} color={Colors.lightGrey} />
                        <Text style={styles.emptyTitle}>No orders yet</Text>
                        <Text style={styles.emptySubtitle}>Your placed orders will appear here</Text>
                        <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.shopBtnText}>Start Shopping</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
    list: { padding: 12, paddingBottom: 40 },
    orderCard: { backgroundColor: Colors.surface, borderRadius: Layout.radius.lg, padding: 14, ...Layout.shadow.sm },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    orderId: { fontSize: 14, fontWeight: '700', color: Colors.text },
    orderDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Layout.radius.full },
    statusText: { fontSize: 11, fontWeight: '700' },
    trackingBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
    trackingStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    trackingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.lightGrey, alignItems: 'center', justifyContent: 'center' },
    trackingLine: { flex: 1, height: 2, backgroundColor: Colors.lightGrey, marginHorizontal: 2 },
    itemsPreview: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 11, color: Colors.textTertiary },
    totalValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    trackingIdBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryContainer, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    trackingIdText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
    cancelBtn: { backgroundColor: Colors.errorLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Layout.radius.sm },
    cancelBtnText: { color: Colors.error, fontSize: 12, fontWeight: '600' },
    etaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    etaText: { fontSize: 11, color: Colors.textTertiary },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
    shopBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Layout.radius.lg },
    shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default OrdersScreen;
