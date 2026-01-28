import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'; // Re-added this as it was missing from the provided block
import { FarmService } from '../../services/farmService';
import { Farm } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';

// Dummy data and types for demonstration
// Farm type is imported from types/database

const DashboardScreen = () => {
    const navigation = useNavigation<any>();
    const theme = useTheme(); // Keep useTheme if it's used elsewhere in the actual implementation
    const { t, i18n } = useTranslation();

    const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'te', label: 'తెలుగు' },
        { code: 'bn', label: 'বাংলা' },
        { code: 'or', label: 'ଓଡ଼ିଆ' },
        { code: 'hi', label: 'हिन्दी' },
    ];

    const changeLanguage = (langCode: string) => {
        i18n.changeLanguage(langCode);
        setLanguageMenuVisible(false);
    };

    const [farms, setFarms] = useState<Farm[]>([]);
    const [loading, setLoading] = useState(true);
    const [addFarmVisible, setAddFarmVisible] = useState(false);
    const [newFarmName, setNewFarmName] = useState('');
    const [newFarmArea, setNewFarmArea] = useState('');
    const [newFarmAddress, setNewFarmAddress] = useState('');

    useEffect(() => {
        // Simulate fetching farms
        setTimeout(() => {
            const mockFarms = [
                { id: '1', name: 'Farm A', area_hectares: 10, address: '123 Farm Rd' },
                { id: '2', name: 'Farm B', area_hectares: 15, address: '456 Country Ln' },
            ] as unknown as Farm[];
            setFarms(mockFarms);
            setLoading(false);
        }, 1500);
    }, []);

    const handleAddFarm = () => {
        if (newFarmName && newFarmArea) {
            const newFarm = {
                id: String(farms.length + 1),
                name: newFarmName,
                area_hectares: parseFloat(newFarmArea),
                address: newFarmAddress,
            } as unknown as Farm;
            setFarms([...farms, newFarm]);
            setNewFarmName('');
            setNewFarmArea('');
            setNewFarmAddress('');
            setAddFarmVisible(false);
        }
    };

    const renderFarmItem = ({ item }: { item: Farm }) => (
        <AppCard onPress={() => navigation.navigate('PondManagement', { farmId: item.id, farmName: item.name })}>
            <Card.Title
                title={item.name}
                subtitle={`Area: ${item.area_hectares} ha • ${item.address || 'No address'}`}
                left={(props) => <Avatar.Icon {...props} icon="barn" style={{ backgroundColor: Colors.secondary }} />}
            />
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="headlineSmall" style={styles.greeting}>{t('common.welcome_back')}</Text>
                        <Button mode="outlined" onPress={() => setLanguageMenuVisible(true)} compact>
                            {languages.find(l => l.code === i18n.language)?.label || 'English'}
                        </Button>
                    </View>
                    <Text variant="bodyLarge">Manage your aquaculture operations efficiently.</Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium">Quick Actions</Text>
                </View>

                <View style={styles.grid}>
                    <QuickActionCard
                        title="Minerals"
                        icon="flask"
                        color={Colors.primary}
                        onPress={() => navigation.navigate('MineralCalculator')}
                    />
                    <QuickActionCard
                        title="Shrimp"
                        icon="calculator"
                        color={Colors.primaryDark}
                        onPress={() => navigation.navigate('ShrimpCalculator')}
                    />
                    <QuickActionCard
                        title="Simulation"
                        icon="chart-bar"
                        color={Colors.secondaryDark}
                        onPress={() => navigation.navigate('Simulation')}
                    />
                    <QuickActionCard
                        title="Farms"
                        icon="barn"
                        color={Colors.secondaryDark}
                        onPress={() => navigation.navigate('FarmManagement')}
                    />
                    <QuickActionCard
                        title="Alerts"
                        icon="bell"
                        color={Colors.error}
                        onPress={() => navigation.navigate('Alerts')}
                    />
                </View>

                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Text variant="titleMedium">Your Farms</Text>
                    <Button onPress={() => setAddFarmVisible(true)}>Add Farm</Button>
                </View>

                {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                    farms.length > 0 ? (
                        <View>
                            {farms.map((farm) => (
                                <View key={farm.id}>{renderFarmItem({ item: farm })}</View>
                            ))}
                        </View>
                    ) : (
                        <AppCard>
                            <Card.Content>
                                <Text>No farms added yet. Add your first farm to get started!</Text>
                            </Card.Content>
                        </AppCard>
                    )
                )}
            </ScrollView>

            <Portal>
                <Modal visible={addFarmVisible} onDismiss={() => setAddFarmVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>Add New Farm</Text>
                    <TextInput label="Farm Name" value={newFarmName} onChangeText={setNewFarmName} mode="outlined" style={{ marginBottom: 12 }} />
                    <TextInput label="Area (Hectares)" value={newFarmArea} onChangeText={setNewFarmArea} mode="outlined" keyboardType="numeric" style={{ marginBottom: 12 }} />
                    <TextInput label="Address" value={newFarmAddress} onChangeText={setNewFarmAddress} mode="outlined" style={{ marginBottom: 12 }} />
                    <Button mode="contained" onPress={handleAddFarm} style={{ marginTop: 8 }} buttonColor={Colors.primary}>
                        Save Farm
                    </Button>
                </Modal>

                <Modal visible={languageMenuVisible} onDismiss={() => setLanguageMenuVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>Select Language</Text>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            onPress={() => changeLanguage(lang.code)}
                            style={{
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#eee',
                                backgroundColor: i18n.language === lang.code ? Colors.primaryLight : 'white'
                            }}
                        >
                            <Text variant="bodyLarge" style={{ fontWeight: i18n.language === lang.code ? 'bold' : 'normal' }}>
                                {lang.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const QuickActionCard = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: color }]} onPress={onPress}>
        <Avatar.Icon size={40} icon={icon} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} color="white" />
        <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Layout.padding },
    header: { marginBottom: 24 },
    greeting: { fontWeight: 'bold', color: Colors.primaryDark },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCard: { width: '48%', padding: 16, borderRadius: Layout.borderRadius, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
    actionText: { color: 'white', fontWeight: 'bold', marginTop: 8 },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: Layout.borderRadius }
});

export default DashboardScreen;
