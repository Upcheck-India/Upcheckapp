import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockDataService, NewsItem } from '../../services/mockDataService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';

const NewsScreen = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNews();
    }, []);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await MockDataService.getNews();
            setNews(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: NewsItem }) => (
        <Card style={styles.card}>
            <Card.Cover source={{ uri: item.imageUrl }} style={styles.cardCover} />
            <Card.Content>
                <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                <Text variant="bodySmall" style={styles.meta}>{item.source} • {item.date}</Text>
                <Text variant="bodyMedium" numberOfLines={3} style={styles.summary}>{item.summary}</Text>
            </Card.Content>
            <Card.Actions>
                <Button textColor={Colors.primary}>Read More</Button>
            </Card.Actions>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Market News" subtitle="Latest aquaculture industry updates" variant="flat" />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
            ) : news.length === 0 ? (
                <EmptyState
                    icon="newspaper-variant-outline"
                    title="No news available"
                    subtitle="Check back later for the latest aquaculture market updates."
                />
            ) : (
                <FlatList
                    data={news}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onRefresh={loadNews}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: Layout.spacing.lg },
    card: {
        marginBottom: Layout.spacing.lg,
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.radius.lg,
        ...Layout.shadow.md,
    },
    cardCover: { borderTopLeftRadius: Layout.radius.lg, borderTopRightRadius: Layout.radius.lg },
    title: { marginTop: Layout.spacing.md, fontWeight: 'bold', color: Colors.text },
    meta: { color: Colors.textTertiary, marginVertical: Layout.spacing.xs },
    summary: { marginTop: Layout.spacing.xs, color: Colors.textSecondary, lineHeight: 20 },
});

export default NewsScreen;
