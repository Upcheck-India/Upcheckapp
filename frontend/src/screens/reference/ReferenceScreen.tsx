import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import {
    referenceApi,
    Species,
    Hatchery,
    Broodstock,
    CreateSpeciesDto,
    CreateHatcheryDto,
    CreateBroodstockDto,
} from '../../api/reference';

// ── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = 'species' | 'hatcheries' | 'broodstocks';

// ── Helper: normalise paged OR flat array responses ──────────────────────────

function extractArray<T>(response: any): T[] {
    const payload = response?.data;
    if (Array.isArray(payload)) return payload as T[];
    if (payload && Array.isArray(payload.data)) return payload.data as T[];
    return [];
}

// ── Inline text input row ────────────────────────────────────────────────────

interface FormFieldProps {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}

const FormField: React.FC<FormFieldProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
}) => (
    <View style={formStyles.fieldRow}>
        <Text style={formStyles.fieldLabel}>{label}</Text>
        <TextInput
            style={formStyles.fieldInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? ''}
            placeholderTextColor={theme.roles.light.textDisabled}
            keyboardType={keyboardType}
            autoCapitalize="none"
        />
    </View>
);

// ── Screen ───────────────────────────────────────────────────────────────────

export const ReferenceScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const TABS: { key: TabKey; label: string; icon: string }[] = [
        { key: 'species', label: t('content.reference.tabSpecies'), icon: 'fish' },
        { key: 'hatcheries', label: t('content.reference.tabHatcheries'), icon: 'home-city' },
        { key: 'broodstocks', label: t('content.reference.tabBroodstocks'), icon: 'egg' },
    ];

    const [activeTab, setActiveTab] = useState<TabKey>('species');

    const [species, setSpecies] = useState<Species[]>([]);
    const [hatcheries, setHatcheries] = useState<Hatchery[]>([]);
    const [broodstocks, setBroodstocks] = useState<Broodstock[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Add-form visibility & submission state
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Species form fields
    const [sScientificName, setSScientificName] = useState('');
    const [sCommonName, setSCommonName] = useState('');
    const [sTempMin, setSTempMin] = useState('');
    const [sTempMax, setSTempMax] = useState('');
    const [sPhMin, setSPhMin] = useState('');
    const [sPhMax, setSPhMax] = useState('');

    // Hatchery form fields
    const [hName, setHName] = useState('');
    const [hLocation, setHLocation] = useState('');

    // Broodstock form fields
    const [bSupplier, setBSupplier] = useState('');
    const [bLineCode, setBLineCode] = useState('');
    const [bOrigin, setBOrigin] = useState('');

    const hasFetched = useRef(false);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchAll = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && hasFetched.current) return;

        setError(null);
        setIsOffline(false);

        try {
            const [speciesRes, hatcheriesRes, broodstocksRes] = await Promise.all([
                referenceApi.getAllSpecies(),
                referenceApi.getAllHatcheries(),
                referenceApi.getAllBroodstocks(),
            ]);

            setSpecies(extractArray<Species>(speciesRes));
            setHatcheries(extractArray<Hatchery>(hatcheriesRes));
            setBroodstocks(extractArray<Broodstock>(broodstocksRes));
            hasFetched.current = true;
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
    }, []);

    // Fetch on mount
    React.useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchAll(true);
    }, [fetchAll]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        hasFetched.current = false;
        fetchAll(true);
    }, [fetchAll]);

    // ── Reset add-form fields when tab changes ────────────────────────────────

    const handleTabChange = useCallback((key: TabKey) => {
        setActiveTab(key);
        setShowAddForm(false);
        setSScientificName('');
        setSCommonName('');
        setSTempMin('');
        setSTempMax('');
        setSPhMin('');
        setSPhMax('');
        setHName('');
        setHLocation('');
        setBSupplier('');
        setBLineCode('');
        setBOrigin('');
    }, []);

    // ── Submit handlers ───────────────────────────────────────────────────────

    const handleAddSpecies = useCallback(async () => {
        if (!sScientificName.trim()) {
            Alert.alert(t('content.reference.alertValidation'), t('content.reference.validationScientificName'));
            return;
        }
        setIsSaving(true);
        try {
            const dto: CreateSpeciesDto = {
                scientificName: sScientificName.trim(),
                commonName: sCommonName.trim() || undefined,
                optimalTempMin: sTempMin ? parseFloat(sTempMin) : undefined,
                optimalTempMax: sTempMax ? parseFloat(sTempMax) : undefined,
                optimalPhMin: sPhMin ? parseFloat(sPhMin) : undefined,
                optimalPhMax: sPhMax ? parseFloat(sPhMax) : undefined,
            };
            await referenceApi.createSpecies(dto);
            setShowAddForm(false);
            setSScientificName('');
            setSCommonName('');
            setSTempMin('');
            setSTempMax('');
            setSPhMin('');
            setSPhMax('');
            hasFetched.current = false;
            await fetchAll(true);
        } catch (err: any) {
            Alert.alert(t('common.error'), err?.message ?? t('content.reference.errorCreateSpecies'));
        } finally {
            setIsSaving(false);
        }
    }, [sScientificName, sCommonName, sTempMin, sTempMax, sPhMin, sPhMax, fetchAll, t]);

    const handleAddHatchery = useCallback(async () => {
        if (!hName.trim()) {
            Alert.alert(t('content.reference.alertValidation'), t('content.reference.validationHatcheryName'));
            return;
        }
        setIsSaving(true);
        try {
            const dto: CreateHatcheryDto = {
                name: hName.trim(),
                location: hLocation.trim() || undefined,
                isActive: true,
            };
            await referenceApi.createHatchery(dto);
            setShowAddForm(false);
            setHName('');
            setHLocation('');
            hasFetched.current = false;
            await fetchAll(true);
        } catch (err: any) {
            Alert.alert(t('common.error'), err?.message ?? t('content.reference.errorCreateHatchery'));
        } finally {
            setIsSaving(false);
        }
    }, [hName, hLocation, fetchAll, t]);

    const handleAddBroodstock = useCallback(async () => {
        if (!bSupplier.trim()) {
            Alert.alert(t('content.reference.alertValidation'), t('content.reference.validationSupplier'));
            return;
        }
        setIsSaving(true);
        try {
            const dto: CreateBroodstockDto = {
                supplier: bSupplier.trim(),
                lineCode: bLineCode.trim() || undefined,
                origin: bOrigin.trim() || undefined,
                isActive: true,
            };
            await referenceApi.createBroodstock(dto);
            setShowAddForm(false);
            setBSupplier('');
            setBLineCode('');
            setBOrigin('');
            hasFetched.current = false;
            await fetchAll(true);
        } catch (err: any) {
            Alert.alert(t('common.error'), err?.message ?? t('content.reference.errorCreateBroodstock'));
        } finally {
            setIsSaving(false);
        }
    }, [bSupplier, bLineCode, bOrigin, fetchAll, t]);

    const handleSave = useCallback(() => {
        if (activeTab === 'species') return handleAddSpecies();
        if (activeTab === 'hatcheries') return handleAddHatchery();
        return handleAddBroodstock();
    }, [activeTab, handleAddSpecies, handleAddHatchery, handleAddBroodstock]);

    // ── Active list selection ─────────────────────────────────────────────────

    const activeData: (Species | Hatchery | Broodstock)[] =
        activeTab === 'species'
            ? species
            : activeTab === 'hatcheries'
            ? hatcheries
            : broodstocks;

    // ── Add-form content per tab ──────────────────────────────────────────────

    const renderAddForm = () => {
        if (activeTab === 'species') {
            return (
                <>
                    <FormField
                        label={t('content.reference.fieldScientificName')}
                        value={sScientificName}
                        onChangeText={setSScientificName}
                        placeholder={t('content.reference.placeholderScientificName')}
                    />
                    <FormField
                        label={t('content.reference.fieldCommonName')}
                        value={sCommonName}
                        onChangeText={setSCommonName}
                        placeholder={t('content.reference.placeholderCommonName')}
                    />
                    <View style={formStyles.row}>
                        <View style={formStyles.halfField}>
                            <FormField
                                label={t('content.reference.fieldTempMin')}
                                value={sTempMin}
                                onChangeText={setSTempMin}
                                placeholder={t('content.reference.placeholderTempMin')}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={formStyles.halfField}>
                            <FormField
                                label={t('content.reference.fieldTempMax')}
                                value={sTempMax}
                                onChangeText={setSTempMax}
                                placeholder={t('content.reference.placeholderTempMax')}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                    <View style={formStyles.row}>
                        <View style={formStyles.halfField}>
                            <FormField
                                label={t('content.reference.fieldPhMin')}
                                value={sPhMin}
                                onChangeText={setSPhMin}
                                placeholder={t('content.reference.placeholderPhMin')}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={formStyles.halfField}>
                            <FormField
                                label={t('content.reference.fieldPhMax')}
                                value={sPhMax}
                                onChangeText={setSPhMax}
                                placeholder={t('content.reference.placeholderPhMax')}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                </>
            );
        }

        if (activeTab === 'hatcheries') {
            return (
                <>
                    <FormField
                        label={t('content.reference.fieldHatcheryName')}
                        value={hName}
                        onChangeText={setHName}
                        placeholder={t('content.reference.placeholderHatcheryName')}
                    />
                    <FormField
                        label={t('content.reference.fieldLocation')}
                        value={hLocation}
                        onChangeText={setHLocation}
                        placeholder={t('content.reference.placeholderHatcheryLocation')}
                    />
                </>
            );
        }

        // broodstocks
        return (
            <>
                <FormField
                    label={t('content.reference.fieldSupplier')}
                    value={bSupplier}
                    onChangeText={setBSupplier}
                    placeholder={t('content.reference.placeholderSupplier')}
                />
                <FormField
                    label={t('content.reference.fieldLineCode')}
                    value={bLineCode}
                    onChangeText={setBLineCode}
                    placeholder={t('content.reference.placeholderLineCode')}
                />
                <FormField
                    label={t('content.reference.fieldOrigin')}
                    value={bOrigin}
                    onChangeText={setBOrigin}
                    placeholder={t('content.reference.placeholderOrigin')}
                />
            </>
        );
    };

    // ── Card renderers ────────────────────────────────────────────────────────

    const renderSpeciesCard = (item: Species) => (
        <Card style={styles.itemCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.roles.light.infoBg }]}>
                    <MaterialCommunityIcons name="fish" size={20} color={theme.roles.light.infoText} />
                </View>
                <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.scientificName}
                    </Text>
                    {item.commonName ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.commonName}
                        </Text>
                    ) : null}
                </View>
            </View>

            {(item.optimalTempMin != null || item.optimalPhMin != null || item.optimalSalinityMin != null) && (
                <View style={styles.cardFooter}>
                    {item.optimalTempMin != null && item.optimalTempMax != null && (
                        <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="thermometer" size={14} color={theme.roles.light.textTertiary} />
                            <Text style={styles.metaText}>
                                {item.optimalTempMin}–{item.optimalTempMax} °C
                            </Text>
                        </View>
                    )}
                    {item.optimalPhMin != null && item.optimalPhMax != null && (
                        <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="water" size={14} color={theme.roles.light.textTertiary} />
                            <Text style={styles.metaText}>
                                pH {item.optimalPhMin}–{item.optimalPhMax}
                            </Text>
                        </View>
                    )}
                    {item.optimalSalinityMin != null && item.optimalSalinityMax != null && (
                        <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="water-percent" size={14} color={theme.roles.light.textTertiary} />
                            <Text style={styles.metaText}>
                                {item.optimalSalinityMin}–{item.optimalSalinityMax} ppt
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </Card>
    );

    const renderHatcheryCard = (item: Hatchery) => (
        <Card style={styles.itemCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.roles.light.successBg }]}>
                    <MaterialCommunityIcons name="home-city" size={20} color={theme.roles.light.successText} />
                </View>
                <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.location ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.location}
                        </Text>
                    ) : null}
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor: item.isActive
                                ? theme.roles.light.successBg
                                : theme.roles.light.surfaceVariant,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            {
                                color: item.isActive
                                    ? theme.roles.light.successText
                                    : theme.roles.light.textDisabled,
                            },
                        ]}
                    >
                        {item.isActive ? t('content.reference.statusActive') : t('content.reference.statusInactive')}
                    </Text>
                </View>
            </View>

            {item.contactInfo && Object.keys(item.contactInfo).length > 0 && (
                <View style={styles.cardFooter}>
                    {Object.entries(item.contactInfo).map(([key, value]) => (
                        <View key={key} style={styles.metaChip}>
                            <MaterialCommunityIcons name="phone" size={14} color={theme.roles.light.textTertiary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {String(value)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </Card>
    );

    const renderBroodstockCard = (item: Broodstock) => (
        <Card style={styles.itemCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.roles.light.warningBg }]}>
                    <MaterialCommunityIcons name="egg" size={20} color={theme.roles.light.warningText} />
                </View>
                <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.supplier}
                    </Text>
                    {item.lineCode ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {t('content.reference.linePrefix', { code: item.lineCode })}
                        </Text>
                    ) : null}
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor: item.isActive
                                ? theme.roles.light.successBg
                                : theme.roles.light.surfaceVariant,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            {
                                color: item.isActive
                                    ? theme.roles.light.successText
                                    : theme.roles.light.textDisabled,
                            },
                        ]}
                    >
                        {item.isActive ? t('content.reference.statusActive') : t('content.reference.statusInactive')}
                    </Text>
                </View>
            </View>

            {(item.origin || (item.specifications && Object.keys(item.specifications).length > 0)) && (
                <View style={styles.cardFooter}>
                    {item.origin && (
                        <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="map-marker" size={14} color={theme.roles.light.textTertiary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {item.origin}
                            </Text>
                        </View>
                    )}
                    {item.specifications &&
                        Object.entries(item.specifications).slice(0, 2).map(([key, value]) => (
                            <View key={key} style={styles.metaChip}>
                                <MaterialCommunityIcons
                                    name="tag-outline"
                                    size={14}
                                    color={theme.roles.light.textTertiary}
                                />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {key}: {String(value)}
                                </Text>
                            </View>
                        ))}
                </View>
            )}
        </Card>
    );

    const renderItem = useCallback(
        ({ item }: { item: Species | Hatchery | Broodstock }) => {
            if (activeTab === 'species') return renderSpeciesCard(item as Species);
            if (activeTab === 'hatcheries') return renderHatcheryCard(item as Hatchery);
            return renderBroodstockCard(item as Broodstock);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeTab],
    );

    // ── Tab bar ───────────────────────────────────────────────────────────────

    const renderTab = (tab: (typeof TABS)[number]) => {
        const isActive = activeTab === tab.key;
        return (
            <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={18}
                    color={isActive ? theme.roles.light.primary : theme.roles.light.textSecondary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                </Text>
            </TouchableOpacity>
        );
    };

    // ── Empty state config per tab ────────────────────────────────────────────

    const emptyConfig: Record<TabKey, { icon: string; title: string; subtitle: string }> = {
        species: {
            icon: 'fish',
            title: t('content.reference.emptySpeciesTitle'),
            subtitle: t('content.reference.emptySpeciesSubtitle'),
        },
        hatcheries: {
            icon: 'home-city',
            title: t('content.reference.emptyHatcheriesTitle'),
            subtitle: t('content.reference.emptyHatcheriesSubtitle'),
        },
        broodstocks: {
            icon: 'egg',
            title: t('content.reference.emptyBroodstocksTitle'),
            subtitle: t('content.reference.emptyBroodstocksSubtitle'),
        },
    };

    const empty = emptyConfig[activeTab];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={theme.roles.light.textPrimary}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('content.reference.title')}</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddForm((v) => !v)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={showAddForm ? 'close' : 'plus'}
                            size={22}
                            color={theme.roles.light.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Tab bar */}
                <View style={styles.tabBar}>
                    {TABS.map(renderTab)}
                </View>

                {/* Collapsible Add Form */}
                {showAddForm && (
                    <View style={formStyles.container}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={formStyles.formTitle}>
                                {activeTab === 'species'
                                    ? t('content.reference.addSpecies')
                                    : activeTab === 'hatcheries'
                                    ? t('content.reference.addHatchery')
                                    : t('content.reference.addBroodstock')}
                            </Text>
                            {renderAddForm()}
                            <View style={formStyles.formActions}>
                                <TouchableOpacity
                                    style={formStyles.cancelBtn}
                                    onPress={() => setShowAddForm(false)}
                                    disabled={isSaving}
                                >
                                    <Text style={formStyles.cancelBtnText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[formStyles.saveBtn, isSaving && formStyles.saveBtnDisabled]}
                                    onPress={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color={theme.roles.light.textInverse} />
                                    ) : (
                                        <Text style={formStyles.saveBtnText}>{t('common.save')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Body */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={theme.roles.light.primary} />
                        <Text style={styles.loadingText}>{t('content.reference.loadingText')}</Text>
                    </View>
                ) : isOffline ? (
                    <NetworkError onRetry={handleRetry} />
                ) : error && activeData.length === 0 ? (
                    <ErrorState
                        title={t('content.reference.errorLoadTitle')}
                        error={error}
                        onRetry={handleRetry}
                    />
                ) : (
                    <FlatList
                        data={activeData}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
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
                                icon={empty.icon as any}
                                title={empty.title}
                                subtitle={empty.subtitle}
                            />
                        }
                    />
                )}
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

// ── Form styles ───────────────────────────────────────────────────────────────

const formStyles = StyleSheet.create({
    container: {
        backgroundColor: theme.roles.light.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        paddingHorizontal: theme.spacing[4],
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[3],
        maxHeight: 320,
    },
    formTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[3],
    },
    halfField: {
        flex: 1,
    },
    fieldRow: {
        marginBottom: theme.spacing[3],
    },
    fieldLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[1],
    },
    fieldInput: {
        backgroundColor: theme.roles.light.surface,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
        marginBottom: theme.spacing[2],
    },
    cancelBtn: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    cancelBtnText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    saveBtn: {
        paddingHorizontal: theme.spacing[5],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.primary,
        minWidth: 72,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textInverse,
    },
});

// ── Styles ────────────────────────────────────────────────────────────────────

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
    addButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.surfaceVariant,
    },
    tabActive: {
        backgroundColor: theme.roles.light.primary + '20',
    },
    tabLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginLeft: theme.spacing[1],
    },
    tabLabelActive: {
        color: theme.roles.light.primary,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[8],
    },
    loadingText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[4],
    },
    listContent: {
        padding: theme.spacing[4],
        paddingBottom: 100,
    },
    itemCard: {
        marginBottom: theme.spacing[3],
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleBlock: {
        flex: 1,
        marginLeft: theme.spacing[3],
    },
    cardTitle: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    cardSubtitle: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    statusText: {
        ...theme.typeScale.labelSmall,
    },
    cardFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        backgroundColor: theme.roles.light.surfaceVariant,
        gap: theme.spacing[2],
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
    },
    metaText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textTertiary,
    },
});
