import React from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Product } from '../../services/mockProductService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { GradientButton } from '../../components/GradientButton';

const ProductDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const product: Product = route.params?.product;

    if (!product) return null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Image source={{ uri: product.imageUrl }} style={styles.image} />

                <View style={styles.detailsContainer}>
                    <Text variant="headlineSmall" style={styles.title}>{product.name}</Text>
                    <Text variant="titleLarge" style={styles.price}>
                        {product.currency}{product.price}
                    </Text>

                    <View style={styles.tagContainer}>
                        <Chip icon="tag" style={styles.tag} textStyle={styles.tagText}>{product.category}</Chip>
                        <Chip
                            icon={() => <MaterialCommunityIcons name="star" size={16} color={Colors.warning} />}
                            style={styles.tag}
                            textStyle={styles.tagText}
                        >
                            {product.rating}
                        </Chip>
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
                <GradientButton
                    title="Add to Cart"
                    icon="cart-plus"
                    onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Success', 'Added to cart (Mock)');
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    content: { paddingBottom: 90 },
    image: { width: '100%', height: 300, resizeMode: 'cover' },
    detailsContainer: { padding: Layout.spacing.xl },
    title: { fontWeight: 'bold', marginBottom: Layout.spacing.sm, color: Colors.text },
    price: { fontWeight: 'bold', marginBottom: Layout.spacing.lg, color: Colors.primary },
    tagContainer: { flexDirection: 'row', marginBottom: Layout.spacing.xl, gap: Layout.spacing.sm },
    tag: { backgroundColor: Colors.surfaceVariant },
    tagText: { color: Colors.textSecondary, fontSize: 13 },
    divider: { marginBottom: Layout.spacing.xl },
    sectionTitle: { fontWeight: 'bold', marginBottom: Layout.spacing.sm, color: Colors.text },
    description: { color: Colors.textSecondary, marginBottom: Layout.spacing.md, lineHeight: 22 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Layout.spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        ...Layout.shadow.xl,
    },
});

export default ProductDetailScreen;
