import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { productsApi, Product } from '../../api/products';
import { useFocusEffect } from '@react-navigation/native';

export const ShopScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Cache ref
    const cacheRef = useRef<{ data: Product[]; timestamp: number } | null>(null);
    const CACHE_TTL = 30000;

    const fadeIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    const fetchProducts = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && cacheRef.current) {
            const { data, timestamp } = cacheRef.current;
            if (Date.now() - timestamp < CACHE_TTL) {
                setProducts(data);
                setIsLoading(false);
                fadeIn();
                return;
            }
        }

        setError(null);
        setIsOffline(false);

        try {
            const response = await productsApi.getAll();
            // Handle both array response and paged { data: [] } shape
            const raw: any = response.data;
            const list: Product[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                ? raw.data
                : [];
            setProducts(list);
            cacheRef.current = { data: list, timestamp: Date.now() };
            fadeIn();
        } catch (err: any) {
            const statusCode = err?.response?.status;
            if (statusCode === 0 || err?.code === 'NETWORK_ERROR' || !err?.response) {
                setIsOffline(true);
            }
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [fadeIn]);

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [fetchProducts])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchProducts(true);
    }, [fetchProducts]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchProducts(true);
    }, [fetchProducts]);

    // Derive unique categories from data
    const categories = React.useMemo(() => {
        const seen = new Set<string>();
        const cats: { key: string; label: string }[] = [{ key: 'all', label: t('inventory.catAllShop') }];
        products.forEach((p) => {
            if (p.category && !seen.has(p.category)) {
                seen.add(p.category);
                cats.push({ key: p.category, label: p.category.charAt(0).toUpperCase() + p.category.slice(1) });
            }
        });
        return cats;
    }, [products, t]);

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter((p) => p.category === selectedCategory);

    const getStockStatus = (product: Product) => {
        if (product.stock <= 0) return { color: theme.roles.light.dangerText, bg: theme.roles.light.dangerBg, label: t('inventory.shopOutOfStock') };
        if (product.stock <= 5) return { color: theme.roles.light.warningText, bg: theme.roles.light.warningBg, label: t('inventory.lowStock') };
        return { color: theme.roles.light.successText, bg: theme.roles.light.successBg, label: t('inventory.inStock') };
    };

    const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderCategoryChip = (cat: { key: string; label: string }) => (
        <TouchableOpacity
            key={cat.key}
            style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
        >
            <Text
                style={[
                    styles.categoryChipLabel,
                    selectedCategory === cat.key && styles.categoryChipLabelActive,
                ]}
            >
                {cat.label}
            </Text>
        </TouchableOpacity>
    );

    const renderProductItem = useCallback(
        ({ item }: { item: Product }) => {
            const status = getStockStatus(item);
            const animStyle = {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            };

            return (
                <Animated.View style={animStyle}>
                    <Card style={styles.productCard}>
                        {/* Header row */}
                        <View style={styles.cardHeader}>
                            <View style={[styles.categoryIcon, { backgroundColor: status.bg }]}>
                                <MaterialCommunityIcons
                                    name="tag-outline"
                                    size={20}
                                    color={status.color}
                                />
                            </View>
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.productCategory}>{item.category}</Text>
                            </View>
                            {item.stock <= 0 && (
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>
                                        {t('inventory.shopOutOfStock')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Description */}
                        {!!item.description && (
                            <Text style={styles.productDescription} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}

                        {/* Footer row */}
                        <View style={styles.cardFooter}>
                            <View style={styles.priceBlock}>
                                {item.salePrice != null && item.salePrice < item.price ? (
                                    <>
                                        <Text style={styles.salePriceText}>{formatPrice(item.salePrice)}</Text>
                                        <Text style={styles.originalPriceText}>{formatPrice(item.price)}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                                )}
                            </View>
                            <View style={[styles.stockBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.stockBadgeText, { color: status.color }]}>
                                    {item.stock > 0
                                        ? t('inventory.shopStockCount', { count: item.stock })
                                        : t('inventory.shopUnavailable')}
                                </Text>
                            </View>
                        </View>
                    </Card>
                </Animated.View>
            );
        },
        [fadeAnim, scaleAnim, t]
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('inventory.shopTitle')}</Text>
                {isLoading && !isRefreshing ? (
                    <ActivityIndicator size="small" color={theme.roles.light.primary} />
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* Category filter chips */}
            {categories.length > 1 && (
                <View style={styles.categoryBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarContent}>
                        {categories.map(renderCategoryChip)}
                    </ScrollView>
                </View>
            )}

            {isLoading && !isRefreshing ? null : isOffline ? (
                <NetworkError onRetry={handleRetry} />
            ) : error && products.length === 0 ? (
                <ErrorState
                    title={t('inventory.shopErrorTitle')}
                    error={error}
                    onRetry={handleRetry}
                />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.roles.light.primary]}
                            tintColor={theme.roles.light.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon="storefront-outline"
                            title={t('inventory.shopEmptyTitle')}
                            subtitle={t('inventory.shopEmptySubtitle')}
                        />
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backButton: {
        marginRight: theme.spacing[3],
        padding: theme.spacing[1],
    },
    headerTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        flex: 1,
    },
    headerSpacer: {
        width: 24,
    },
    categoryBar: {
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    categoryBarContent: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        gap: theme.spacing[2],
    },
    categoryChip: {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    categoryChipActive: {
        backgroundColor: theme.roles.light.primary + '20',
    },
    categoryChipLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    categoryChipLabelActive: {
        color: theme.roles.light.primary,
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    productCard: {
        marginBottom: theme.spacing[3],
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        flex: 1,
        marginLeft: theme.spacing[3],
    },
    productName: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    productCategory: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    statusText: {
        ...theme.typeScale.labelSmall,
    },
    productDescription: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        paddingHorizontal: theme.spacing[4],
        paddingBottom: theme.spacing[3],
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing[4],
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    priceBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    priceText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
    },
    salePriceText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.successText,
        fontWeight: '600',
    },
    originalPriceText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textDisabled,
        textDecorationLine: 'line-through',
    },
    stockBadge: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    stockBadgeText: {
        ...theme.typeScale.labelSmall,
    },
});
