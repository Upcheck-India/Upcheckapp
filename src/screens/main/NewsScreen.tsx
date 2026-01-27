import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockDataService, NewsItem } from '../../services/mockDataService';
import { Colors } from '../../constants/Colors';

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
            <Card.Cover source={{ uri: item.imageUrl }} />
            <Card.Content>
                <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                <Text variant="bodySmall" style={styles.meta}>{item.source} • {item.date}</Text>
                <Text variant="bodyMedium" numberOfLines={3} style={styles.summary}>{item.summary}</Text>
            </Card.Content>
            <Card.Actions>
                <Button>Read More</Button>
            </Card.Actions>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.headerTitle}>Market News</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator /></View>
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
    header: { padding: 16, backgroundColor: Colors.surface, elevation: 2 },
    headerTitle: { fontWeight: 'bold', color: Colors.primaryDark },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    card: { marginBottom: 16, backgroundColor: Colors.surface },
    title: { marginTop: 12, fontWeight: 'bold', color: Colors.text },
    meta: { color: Colors.textSecondary, marginVertical: 4 },
    summary: { marginTop: 4, color: Colors.text }
});

export default NewsScreen;
