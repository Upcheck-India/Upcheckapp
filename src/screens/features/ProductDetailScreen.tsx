import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Card, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Product } from '../../services/mockProductService';

const ProductDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const product: Product = route.params?.product;
    const theme = useTheme();

    if (!product) return null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Image source={{ uri: product.imageUrl }} style={styles.image} />

                <View style={styles.detailsContainer}>
                    <Text variant="headlineSmall" style={styles.title}>{product.name}</Text>
                    <Text variant="titleLarge" style={[styles.price, { color: theme.colors.primary }]}>
                        {product.currency}{product.price}
                    </Text>

                    <View style={styles.tagContainer}>
                        <Card style={styles.tag} mode="outlined">
                            <Card.Content style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
                                <Text>{product.category}</Text>
                            </Card.Content>
                        </Card>
                        <Card style={[styles.tag, { marginLeft: 8 }]} mode="outlined">
                            <Card.Content style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
                                <Text>⭐ {product.rating}</Text>
                            </Card.Content>
                        </Card>
                    </View>

                    <Divider style={styles.divider} />

                    <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
                    <Text variant="bodyMedium" style={styles.description}>
                        {product.description}
                    </Text>
                    <Text variant="bodyMedium" style={styles.description}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </Text>

                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    icon="cart-plus"
                    onPress={() => alert('Added to cart (Mock)')}
                    style={styles.cartBtn}
                    contentStyle={{ height: 50 }}
                >
                    Add to Cart
                </Button>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { paddingBottom: 80 },
    image: { width: '100%', height: 300, resizeMode: 'cover' },
    detailsContainer: { padding: 20 },
    title: { fontWeight: 'bold', marginBottom: 8 },
    price: { fontWeight: 'bold', marginBottom: 16 },
    tagContainer: { flexDirection: 'row', marginBottom: 20 },
    tag: { borderRadius: 4 },
    divider: { marginBottom: 20 },
    sectionTitle: { fontWeight: 'bold', marginBottom: 8 },
    description: { color: '#444', marginBottom: 12, lineHeight: 22 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 8
    },
    cartBtn: { borderRadius: 8 }
});

export default ProductDetailScreen;
