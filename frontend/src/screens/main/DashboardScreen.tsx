import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, Avatar, Button, Card, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FarmService } from '../../services/farmService';
import { Farm } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { GradientButton } from '../../components/GradientButton';

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
                areaHectares: newFarmArea ? parseFloat(newFarmArea) : undefined,
                address: newFarmAddress.trim() || undefined,
                privacySetting: 'private',
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
                subtitle={`${item.areaHectares ? item.areaHectares + ' ha' : 'No area'} • ${item.address || 'No address'}`}
                left={(props) => <Avatar.Icon {...props} icon="home-variant" style={{ backgroundColor: Colors.primary }} />}
            />
        </AppCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadFarms} colors={[Colors.primary]} tintColor={Colors.primary} />
                }
            >
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
                            icon="test-tube"
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
                            icon="chart-timeline-variant-shimmer"
                            gradientColors={[Colors.secondary, Colors.secondaryDark]}
                            onPress={() => navigation.navigate('Simulation')}
                        />
                        <QuickActionCard
                            title="Ponds"
                            icon="waves"
                            gradientColors={[Colors.gradientEnd, Colors.primaryDark]}
                            onPress={() => navigation.navigate('FarmManagement')}
                        />
                        <QuickActionCard
                            title="Alerts"
                            icon="bell-alert"
                            gradientColors={['#FF6B6B', '#D32F2F']}
                            onPress={() => navigation.navigate('Alerts')}
                        />
                    </View>

                    <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Your Farms</Text>
                        <Button onPress={() => setAddFarmVisible(true)} textColor={Colors.primary}>Add Farm</Button>
                    </View>

                    {loading && farms.length === 0 ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
                    ) : farms.length > 0 ? (
                        <View>
                            {farms.map((farm) => renderFarmItem({ item: farm }))}
                        </View>
                    ) : (
                        <EmptyState
                            icon="tractor-variant"
                            title="No farms added yet"
                            subtitle='Tap "Add Farm" to create your first farm and start managing your aquaculture operations.'
                            actionLabel="Add Farm"
                            onAction={() => setAddFarmVisible(true)}
                        />
                    )}
                </View>
            </ScrollView>

            <Portal>
                <Modal visible={addFarmVisible} onDismiss={() => setAddFarmVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Farm</Text>
                    <TextInput
                        label="Farm Name *"
                        value={newFarmName}
                        onChangeText={setNewFarmName}
                        mode="outlined"
                        style={styles.modalInput}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                        left={<TextInput.Icon icon="home-group" />}
                    />
                    <TextInput
                        label="Area (Hectares)"
                        value={newFarmArea}
                        onChangeText={setNewFarmArea}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.modalInput}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                        left={<TextInput.Icon icon="ruler-square" />}
                    />
                    <TextInput
                        label="Address"
                        value={newFarmAddress}
                        onChangeText={setNewFarmAddress}
                        mode="outlined"
                        style={styles.modalInput}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                        left={<TextInput.Icon icon="map-marker" />}
                    />
                    <GradientButton
                        title="Create Farm"
                        onPress={handleAddFarm}
                        loading={creating}
                        disabled={creating}
                        icon="plus-circle"
                        style={{ marginTop: Layout.spacing.sm }}
                    />
                    <Button
                        mode="text"
                        onPress={() => setAddFarmVisible(false)}
                        style={{ marginTop: Layout.spacing.sm }}
                        disabled={creating}
                    >
                        Cancel
                    </Button>
                </Modal>

                <Modal visible={languageMenuVisible} onDismiss={() => setLanguageMenuVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Select Language</Text>
                    {languages.map((lang) => {
                        const isActive = i18n.language === lang.code;
                        return (
                            <TouchableOpacity
                                key={lang.code}
                                onPress={() => changeLanguage(lang.code)}
                                style={[styles.langOption, isActive && styles.langOptionActive]}
                            >
                                {isActive && <MaterialCommunityIcons name="check" size={20} color={Colors.textLight} style={{ marginRight: 8 }} />}
                                <Text variant="bodyLarge" style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? Colors.textLight : Colors.text }}>
                                    {lang.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const QuickActionCard = ({ title, icon, gradientColors, onPress }: any) => (
    <TouchableOpacity
        style={styles.actionCardWrapper}
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }}
        activeOpacity={0.8}
    >
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCard}
        >
            <View style={styles.actionIconCircle}>
                <MaterialCommunityIcons name={icon} size={24} color="white" />
            </View>
            <Text style={styles.actionText}>{title}</Text>
        </LinearGradient>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { flexGrow: 1 },
    header: {
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
        borderBottomLeftRadius: Layout.headerBorderRadius,
        borderBottomRightRadius: Layout.headerBorderRadius,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: { fontWeight: 'bold', color: Colors.textLight },
    subGreeting: { color: 'rgba(255,255,255,0.85)', marginTop: Layout.spacing.xs },
    langButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        borderRadius: Layout.radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    langButtonText: { color: Colors.textLight, fontWeight: '600', fontSize: 13 },
    content: { padding: Layout.spacing.lg },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    sectionTitle: { color: Colors.text, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCardWrapper: { width: '48%', marginBottom: Layout.spacing.lg },
    actionCard: {
        padding: Layout.spacing.lg,
        borderRadius: Layout.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
        ...Layout.shadow.lg,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: { color: Colors.textLight, fontWeight: 'bold', marginTop: Layout.spacing.sm, fontSize: 13 },
    modalContent: {
        backgroundColor: Colors.modalBackground,
        padding: Layout.modalPadding,
        margin: Layout.modalMargin,
        borderRadius: Layout.modalRadius,
    },
    modalTitle: {
        marginBottom: Layout.spacing.lg,
        color: Colors.text,
        fontWeight: '600',
    },
    modalInput: {
        marginBottom: Layout.spacing.md,
        backgroundColor: Colors.surface,
    },
    farmCard: { marginBottom: Layout.spacing.md },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    langOptionActive: {
        backgroundColor: Colors.primary,
        borderRadius: Layout.radius.sm,
        marginVertical: 2,
        borderBottomWidth: 0,
    },
});

export default DashboardScreen;
