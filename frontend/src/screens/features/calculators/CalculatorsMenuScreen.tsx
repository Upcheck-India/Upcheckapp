import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { AppCard } from '../../../components/AppCard';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - Layout.padding * 3) / 2;

const MenuItem = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <AppCard style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={32} color={color} />
            </View>
            <Text variant="titleMedium" style={styles.cardTitle}>{title}</Text>
        </AppCard>
    </TouchableOpacity>
);

const CalculatorsMenuScreen = ({ navigation }: any) => {
    const theme = useTheme();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Calculators</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Scientific tools for precise shrimp farming
                    </Text>
                </View>

                <View style={styles.grid}>
                    <MenuItem
                        title="Growth & FCR"
                        icon="shrimp"
                        color={Colors.primary}
                        onPress={() => navigation.navigate('CultivationPerformance')}
                    />
                    <MenuItem
                        title="Free Ammonia"
                        icon="water-alert-outline"
                        color={Colors.error}
                        onPress={() => navigation.navigate('FreeAmmonia')}
                    />
                    <MenuItem
                        title="Dosage"
                        icon="bowl-mix-outline"
                        color={Colors.accent}
                        onPress={() => navigation.navigate('ProductDosage')}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Layout.padding,
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    subtitle: {
        color: Colors.textSecondary,
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.padding,
    },
    card: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH, // Square cards
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 24, // Extra rounded
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        textAlign: 'center',
        fontWeight: '600',
        color: Colors.text,
    },
});

export default CalculatorsMenuScreen;
