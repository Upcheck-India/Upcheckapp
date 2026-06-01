import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { theme } from '../../theme';
import { newsApi, NewsArticle } from '../../api/news';
import { useFocusEffect } from '@react-navigation/native';

const ALL_KEY = 'all';

export const NewsListScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(ALL_KEY);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

    const fetchArticles = useCallback(async (forceRefresh = false) => {
        setError(null);
        setIsOffline(false);

        try {
            const response = await newsApi.getAll();
            const raw = response.data as any;
            const items: NewsArticle[] = Array.isArray(raw) ? raw : raw?.data ?? [];
            setArticles(items);
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
            fetchArticles();
        }, [fetchArticles])
    );

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchArticles(true);
    }, [fetchArticles]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchArticles(true);
    }, [fetchArticles]);

    const categories: string[] = [
        ALL_KEY,
        ...Array.from(new Set(articles.map(a => a.category).filter((c): c is string => !!c))),
    ];

    const filteredArticles = selectedCategory === ALL_KEY
        ? articles
        : articles.filter(a => a.category === selectedCategory);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const renderCategoryChip = (cat: string) => (
        <TouchableOpacity
            key={cat}
            style={[
                styles.categoryTab,
                selectedCategory === cat && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
        >
            <Text style={[
                styles.categoryLabel,
                selectedCategory === cat && styles.categoryLabelActive,
            ]}>
                {cat === ALL_KEY ? t('content.news.categoryAll') : cat}
            </Text>
        </TouchableOpacity>
    );

    const renderArticleItem = useCallback(({ item }: { item: NewsArticle }) => {
        const animStyle = {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
        };

        return (
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('NewsDetail', { id: item.id })}
                    activeOpacity={0.7}
                >
                    <Card style={styles.articleCard}>
                        <View style={styles.articleHeader}>
                            <View style={styles.articleMeta}>
                                {item.category ? (
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                                    </View>
                                ) : null}
                                <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
                            </View>
                        </View>
                        <Text style={styles.articleTitle} numberOfLines={2}>
                            {item.title}
                        </Text>
                        {item.summary ? (
                            <Text style={styles.articleExcerpt} numberOfLines={3}>
                                {item.summary}
                            </Text>
                        ) : null}
                        <View style={styles.articleFooter}>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={18}
                                color={theme.roles.light.primary}
                            />
                        </View>
                    </Card>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [navigation, fadeAnim, scaleAnim]);

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('content.news.title')}</Text>
                <View style={styles.headerSpacer} />
            </View>

            {categories.length > 1 && (
                <View style={styles.categoryBar}>
                    {categories.map(renderCategoryChip)}
                </View>
            )}

            {isLoading ? (
                <View style={styles.listContent}>
                    <SkeletonList count={4} />
                </View>
            ) : isOffline ? (
                <NetworkError onRetry={handleRetry} />
            ) : error && articles.length === 0 ? (
                <ErrorState
                    title={t('content.news.errorLoad')}
                    error={error}
                    onRetry={handleRetry}
                />
            ) : (
                <FlatList
                    data={filteredArticles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderArticleItem}
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
                            icon="newspaper-variant-outline"
                            title={t('content.news.emptyTitle')}
                            subtitle={t('content.news.emptySubtitle')}
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    categoryTabActive: {
        backgroundColor: theme.roles.light.primary + '20',
    },
    categoryLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    categoryLabelActive: {
        color: theme.roles.light.primary,
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    articleCard: {
        marginBottom: theme.spacing[3],
        padding: 0,
        overflow: 'hidden',
    },
    articleHeader: {
        paddingHorizontal: theme.spacing[4],
        paddingTop: theme.spacing[4],
    },
    articleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginBottom: theme.spacing[2],
    },
    categoryBadge: {
        backgroundColor: theme.roles.light.infoBg,
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    categoryBadgeText: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.infoText,
    },
    dateText: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textTertiary,
    },
    articleTitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '600',
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    articleExcerpt: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[3],
        lineHeight: 20,
    },
    articleFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        backgroundColor: theme.roles.light.surfaceVariant,
    },
});
