import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { newsApi, NewsArticle } from '../../api/news';
import { useFocusEffect } from '@react-navigation/native';

export const NewsDetailScreen = ({ route, navigation }: any) => {
    const { id } = route.params as { id: string };
    const { t } = useTranslation();

    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchArticle = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await newsApi.getById(id);
            setArticle(response.data);
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            fetchArticle();
        }, [fetchArticle])
    );

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {article?.title ?? t('content.news.fallbackTitle')}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.roles.light.primary} />
                </View>
            ) : error ? (
                <ErrorState
                    title={t('content.news.errorLoadArticle')}
                    error={error}
                    onRetry={fetchArticle}
                />
            ) : article ? (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Card style={styles.articleCard}>
                        {/* Category + Date row */}
                        <View style={styles.metaRow}>
                            {article.category ? (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryBadgeText}>{article.category}</Text>
                                </View>
                            ) : null}
                            <Text style={styles.dateText}>{formatDate(article.publishedAt)}</Text>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>{article.title}</Text>

                        {/* Summary / excerpt */}
                        {article.summary ? (
                            <View style={styles.summaryContainer}>
                                <Text style={styles.summaryText}>{article.summary}</Text>
                            </View>
                        ) : null}

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Full content body */}
                        <Text style={styles.contentText}>
                            {article.content ?? ''}
                        </Text>
                    </Card>
                </ScrollView>
            ) : null}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    articleCard: {
        padding: 0,
        overflow: 'hidden',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[2],
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
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textPrimary,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
    },
    summaryContainer: {
        marginHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[3],
        padding: theme.spacing[3],
        backgroundColor: theme.roles.light.surfaceVariant,
        borderRadius: theme.radius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.primary,
    },
    summaryText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        fontStyle: 'italic',
    },
    divider: {
        height: 1,
        backgroundColor: theme.roles.light.borderDefault,
        marginHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    contentText: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        paddingHorizontal: theme.spacing[4],
        paddingBottom: theme.spacing[6],
        lineHeight: 28,
    },
});
