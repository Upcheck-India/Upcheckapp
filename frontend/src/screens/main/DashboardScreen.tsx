import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FarmService } from '../../services/farmService';
import { Farm } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';

const DashboardScreen = () => {
    const navigation = useNavigation<any>();
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
    const [creating, setCreating] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadFarms();
        }, [])
    );

    const loadFarms = async () => {
        setLoading(true);
        try {
            const data = await FarmService.fetchFarms();
            setFarms(data);
        } catch (error: any) {
            console.error('Error loading farms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFarm = async () => {
        if (!newFarmName.trim()) {
            Alert.alert('Validation', 'Farm name is required');
            return;
        }

        setCreating(true);
        try {
            await FarmService.createFarm({
                name: newFarmName.trim(),
                area_hectares: newFarmArea ? parseFloat(newFarmArea) : undefined,
                address: newFarmAddress.trim() || undefined,
                privacy_setting: 'private',
            });

            setNewFarmName('');
            setNewFarmArea('');
            setNewFarmAddress('');
            setAddFarmVisible(false);
            loadFarms();
            Alert.alert('Success', 'Farm created successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create farm. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const renderFarmItem = ({ item }: { item: Farm }) => (
        <AppCard
            key={item.id}
            onPress={() => navigation.navigate('PondManagement', { farmId: item.id, farmName: item.name })}
            style={styles.farmCard}
        >
            <Card.Title
                title={item.name}
                subtitle={`${item.area_hectares ? item.area_hectares + ' ha' : 'No area'} • ${item.address || 'No address'}`}
                left={(props) => <Avatar.Icon {...props} icon="fish" style={{ backgroundColor: Colors.primary }} />}
            />
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Gradient Header */}
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerRow}>
                        <View>
                            <Text variant="headlineSmall" style={styles.greeting}>{t('common.welcome_back')}</Text>
                            <Text style={styles.subGreeting}>Manage your aquaculture operations</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setLanguageMenuVisible(true)}
                            style={styles.langButton}
                        >
                            <Text style={styles.langButtonText}>
                                {languages.find(l => l.code === i18n.language)?.label || 'EN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.sectionHeader}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
                    </View>

                    <View style={styles.grid}>
                        <QuickActionCard
                            title="Water Quality"
                            icon="water-check"
                            gradientColors={[Colors.gradientStart, Colors.gradientMiddle]}
                            onPress={() => navigation.navigate('MineralCalculator')}
                        />
                        <QuickActionCard
                            title="Shrimp"
                            icon="shrimp"
                            gradientColors={[Colors.gradientMiddle, Colors.gradientEnd]}
                            onPress={() => navigation.navigate('ShrimpCalculator')}
                        />
                        <QuickActionCard
                            title="Simulation"
                            icon="waves"
                            gradientColors={[Colors.secondary, Colors.secondaryDark]}
                            onPress={() => navigation.navigate('Simulation')}
                        />
                        <QuickActionCard
                            title="Ponds"
                            icon="fishbowl"
                            gradientColors={[Colors.gradientEnd, Colors.primaryDark]}
                            onPress={() => navigation.navigate('FarmManagement')}
                        />
                        <QuickActionCard
                            title="Alerts"
                            icon="bell-ring"
                            gradientColors={['#FF6B6B', '#D32F2F']}
                            onPress={() => navigation.navigate('Alerts')}
                        />
                    </View>

                    <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Your Farms</Text>
                        <Button onPress={() => setAddFarmVisible(true)} textColor={Colors.primary}>Add Farm</Button>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
                    ) : farms.length > 0 ? (
                        <View>
                            {farms.map((farm) => renderFarmItem({ item: farm }))}
                        </View>
                    ) : (
                        <AppCard>
                            <Card.Content style={styles.emptyCard}>
                                <Avatar.Icon size={64} icon="fish" style={{ backgroundColor: Colors.secondaryContainer }} color={Colors.primary} />
                                <Text style={styles.emptyText}>No farms added yet</Text>
                                <Text style={styles.emptySubtext}>Tap "Add Farm" to create your first farm</Text>
                            </Card.Content>
                        </AppCard>
                    )}
                </View>
            </ScrollView>

            <Portal>
                <Modal visible={addFarmVisible} onDismiss={() => setAddFarmVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={{ marginBottom: 16, color: Colors.text }}>Add New Farm</Text>
                    <TextInput
                        label="Farm Name *"
                        value={newFarmName}
                        onChangeText={setNewFarmName}
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />
                    <TextInput
                        label="Area (Hectares)"
                        value={newFarmArea}
                        onChangeText={setNewFarmArea}
                        mode="outlined"
                        keyboardType="numeric"
                        style={{ marginBottom: 12 }}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />
                    <TextInput
                        label="Address"
                        value={newFarmAddress}
                        onChangeText={setNewFarmAddress}
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />
                    <TouchableOpacity onPress={handleAddFarm} disabled={creating}>
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            {creating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.gradientButtonText}>Create Farm</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                    <Button
                        mode="text"
                        onPress={() => setAddFarmVisible(false)}
                        style={{ marginTop: 8 }}
                        disabled={creating}
                    >
                        Cancel
                    </Button>
                </Modal>

                <Modal visible={languageMenuVisible} onDismiss={() => setLanguageMenuVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>Select Language</Text>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            onPress={() => changeLanguage(lang.code)}
                            style={[
                                styles.langOption,
                                i18n.language === lang.code && styles.langOptionActive
                            ]}
                        >
                            <Text variant="bodyLarge" style={{ fontWeight: i18n.language === lang.code ? 'bold' : 'normal', color: i18n.language === lang.code ? Colors.textLight : Colors.text }}>
                                {lang.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const QuickActionCard = ({ title, icon, gradientColors, onPress }: any) => (
    <TouchableOpacity style={styles.actionCardWrapper} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCard}
        >
            <Avatar.Icon size={40} icon={icon} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} color="white" />
            <Text style={styles.actionText}>{title}</Text>
        </LinearGradient>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1 },
    header: {
        padding: Layout.padding,
        paddingTop: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: { fontWeight: 'bold', color: Colors.textLight },
    subGreeting: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    langButton: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    langButtonText: { color: Colors.textLight, fontWeight: '600' },
    content: { padding: Layout.padding },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: Colors.text, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCardWrapper: { width: '48%', marginBottom: 16 },
    actionCard: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    actionText: { color: 'white', fontWeight: 'bold', marginTop: 8 },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 },
    farmCard: { marginBottom: 12 },
    emptyCard: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { marginTop: 16, fontSize: 16, color: Colors.text },
    emptySubtext: { marginTop: 4, color: Colors.textSecondary },
    gradientButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    gradientButtonText: {
        color: Colors.textLight,
        fontSize: 16,
        fontWeight: '600',
    },
    langOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    langOptionActive: {
        backgroundColor: Colors.primary,
        borderRadius: 8,
        marginVertical: 2,
    },
});

export default DashboardScreen;
