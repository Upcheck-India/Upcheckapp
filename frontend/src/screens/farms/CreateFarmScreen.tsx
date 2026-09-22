/**
 * CreateFarmScreen — artboard 05, "Your farm", step 1 of 2.
 *
 * The farm is no longer created here. Artboard 06 ends with "Create farm", so
 * the write happens there, once, after the ponds have been named — otherwise
 * backing out of step 2 would leave an orphan farm behind and the step-2 button
 * would be lying about what it does. This screen collects a draft and hands it
 * forward.
 *
 * Step 2 only exists when there are ponds to name. Declaring zero ponds makes
 * this the whole flow, so the step indicator disappears (rather than reading
 * "Step 1 of 2" with no step 2) and the button saves the farm directly.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { Icon } from '../../components/ui/Icon';
import { DistrictPicker } from '../../components/ui/DistrictPicker';
import { findDistrictByName } from '../../data/lgdLocations';
import { theme } from '../../theme';
import { farmsApi, type CreateFarmDto, type Farm } from '../../api/farms';
import { canDecideOnTeam } from '../../api/teamOverview';
import { DEFAULT_SHIFT_HOURS, parseShiftEnd } from '../../features/attendance/shiftState';
import { apiErrorMessage } from '../../api/errors';
import { confirm } from '../../utils/confirm';
import { useMembershipStore } from '../../store/membershipStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { capture, EVENTS, sizeBand } from '../../features/analytics';
import { PhotoAttach } from '../../components/photos/PhotoAttach';

/** ~1.1km at the equator, per farm-location-strategy.md Option B — a farm's
 *  district is the precision the app needs; a coordinate captured at all is a
 *  rounded bonus, never a precise pin. */
const roundToKm = (n: number): number => Math.round(n * 100) / 100;

const WATER_SOURCES: { key: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { key: 'tidal', icon: 'waves' },
    { key: 'river', icon: 'wave' },
    { key: 'borehole', icon: 'pipe' },
    { key: 'reservoir', icon: 'water' },
    { key: 'recycled', icon: 'recycle' },
];

/**
 * The same screen edits a farm.
 *
 * Passed an `editFarmId`, it loads that farm, prefills every field, retitles
 * itself and PATCHes instead of POSTing. Two screens over one form would have
 * meant two sets of validation and two places for the water-source list to
 * drift; the fields a farmer may change are exactly the fields they were asked
 * for in the first place.
 *
 * The pond-count step is creation-only: it names new ponds, and a farm that
 * already has ponds is not the place to ask for more.
 */
export const CreateFarmScreen = ({ navigation, route }: any) => {
    const editFarmId: string | undefined = route?.params?.editFarmId;
    const isEdit = !!editFarmId;
    const { t } = useTranslation();
    const pendingFarmSetup = useAuthStore((s) => s.pendingFarmSetup);
    const completeFarmSetup = useAuthStore((s) => s.completeFarmSetup);
    const showToast = useUIStore((s) => s.showToast);
    // How many farms they already have. Drives the design's "YOUR 4TH FARM"
    // eyebrow and the reassurance line at the bottom.
    const memberships = useMembershipStore((st) => st.memberships);
    const existingFarmCount = memberships.length;

    const [name, setName] = useState('');
    const [numPonds, setNumPonds] = useState(0);
    const [address, setAddress] = useState('');
    const [totalArea, setTotalArea] = useState('');
    const [waterSource, setWaterSource] = useState<string | null>(null);
    // District is the precision the app needs (spec 2026-09-20 compliance
    // C0.2); coords are an optional, rounded bonus filled only by "Detect my
    // district" and never shown raw to the farmer. `hadLocation` remembers
    // whether the loaded farm had ANY of this set, so clearing it can send an
    // explicit null instead of just omitting the fields (which a PATCH would
    // read as "unchanged", not "cleared").
    const [stateCode, setStateCode] = useState<string | null>(null);
    const [districtCode, setDistrictCode] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [hadLocation, setHadLocation] = useState(false);
    const [locating, setLocating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; numPonds?: string; shiftEnd?: string }>({});
    // Shift settings (spec 2026-09-14 attendance B.1, Q4) — owner/manager, edit only.
    const editRole = useMembershipStore((st) => st.grantForFarm(editFarmId).role);
    const canEditShift = isEdit && canDecideOnTeam(editRole);
    const [shiftEnd, setShiftEnd] = useState('');
    // D4: CAA registration number — owner only (the backend refuses managers).
    const canEditCaa = isEdit && editRole === 'owner';
    const [caaNo, setCaaNo] = useState('');
    const [loadedCaa, setLoadedCaa] = useState('');
    // F5 farm identity photo (cap 1) — owner only, matching FarmsService.update()
    // (every non-shift field is owner-only). Edit-only: needs a farmId to scope
    // the upload to. `undefined` = leave unchanged, `null` = explicitly cleared.
    const [photoPath, setPhotoPath] = useState<string | null | undefined>(undefined);
    const [existingPhoto, setExistingPhoto] = useState<{ url?: string | null; thumbUrl?: string | null }>({});
    const [shiftHours, setShiftHours] = useState(DEFAULT_SHIFT_HOURS);
    /** As loaded, so only a CHANGE is sent — an older backend never sees the fields. */
    const [loadedShift, setLoadedShift] = useState<{ end: string; hours: number }>({ end: '', hours: DEFAULT_SHIFT_HOURS });
    // Edit mode blocks on the load: a form that paints empty and fills in a
    // moment later invites a farmer to type over their own data.
    const [isHydrating, setIsHydrating] = useState(isEdit);

    useEffect(() => {
        if (!editFarmId) return;
        let cancelled = false;
        farmsApi
            .getById(editFarmId)
            .then(({ data }) => {
                if (cancelled) return;
                setName(data.name ?? '');
                setAddress(data.address ?? '');
                setTotalArea(data.areaHectares != null ? String(data.areaHectares) : '');
                setWaterSource(data.waterSourceType ?? null);
                if (data.latitude != null && data.longitude != null) {
                    setCoords({ lat: data.latitude, lng: data.longitude });
                }
                setStateCode(data.stateCode ?? null);
                setDistrictCode(data.districtCode ?? null);
                setHadLocation(
                    data.latitude != null || data.longitude != null ||
                    !!data.stateCode || !!data.districtCode,
                );
                // A pg `time` arrives as 'HH:MM:SS'; the form speaks 'HH:MM'.
                const loaded = { end: (data.shiftEndLocal ?? '').slice(0, 5), hours: data.shiftHours ?? DEFAULT_SHIFT_HOURS };
                setShiftEnd(loaded.end);
                setShiftHours(loaded.hours);
                setLoadedShift(loaded);
                setCaaNo(data.caaRegistrationNo ?? '');
                setLoadedCaa(data.caaRegistrationNo ?? '');
                setPhotoPath(data.photoPath ?? undefined);
                setExistingPhoto({ url: data.photoUrl, thumbUrl: data.photoThumbUrl });
            })
            .catch(() => {
                Alert.alert(t('common.error'), t('farms.errorLoadFarm'));
                navigation.goBack();
            })
            .finally(() => { if (!cancelled) setIsHydrating(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editFarmId]);

    // Naming new ponds is a creation step; an existing farm adds ponds elsewhere.
    const hasPondStep = !isEdit && numPonds >= 1;

    // First-run owners were hard-gated into this screen with no way out — an
    // owner who wanted to look around first was stuck on a mandatory form. Give
    // them an explicit escape that clears the gate and drops them into the app;
    // the Getting-Started checklist on Home still nudges them back to finish.
    const skipSetup = () => {
        completeFarmSetup();
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    };

    /**
     * Optional shortcut that fills the picker — never the source of truth.
     * `Accuracy.Low` (a few km) is plenty for "which district", and the
     * reverse-geocode result only ever shows as a district name, never a
     * coordinate. Any coordinate captured here is rounded to ~1km before it
     * is set into state, so nothing more precise ever leaves the device.
     */
    const detectDistrict = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('farms.locationDeniedTitle'), t('farms.locationDeniedMsg'));
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            const rounded = { lat: roundToKm(pos.coords.latitude), lng: roundToKm(pos.coords.longitude) };
            let places: Location.LocationGeocodedAddress[] = [];
            try {
                places = await Location.reverseGeocodeAsync({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                });
            } catch {
                // Reverse geocoding is a nicety; the district picker below still works.
            }
            const guess = findDistrictByName(places[0]?.subregion || places[0]?.city, places[0]?.region);
            if (guess) {
                setStateCode(guess.stateCode);
                setDistrictCode(guess.code);
                setCoords(rounded);
            } else {
                setCoords(rounded);
                Alert.alert(t('farms.districtDetectFailedTitle'), t('farms.districtDetectFailedMsg'));
            }
        } catch {
            Alert.alert(t('common.error'), t('farms.locationError'));
        } finally {
            setLocating(false);
        }
    };

    const clearLocation = () => {
        setStateCode(null);
        setDistrictCode(null);
        setCoords(null);
    };

    /** The draft as the API wants it — built once, used by both exits below.
     *  `undefined` on create simply omits the field; in edit mode, a location
     *  that WAS set and is now cleared sends an explicit `null` so the PATCH
     *  actually clears it instead of being read as "unchanged". */
    const buildDraft = (): CreateFarmDto => {
        const clearedToNull = isEdit && hadLocation && !stateCode && !coords;
        return {
            name: name.trim(),
            address: address.trim() || undefined,
            areaHectares: totalArea ? parseFloat(totalArea) : undefined,
            waterSourceType: waterSource ?? undefined,
            plannedPondCount: numPonds >= 1 ? numPonds : undefined,
            stateCode: stateCode ?? (clearedToNull ? null : undefined),
            districtCode: districtCode ?? (clearedToNull ? null : undefined),
            latitude: coords?.lat ?? (clearedToNull ? null : undefined),
            longitude: coords?.lng ?? (clearedToNull ? null : undefined),
        };
    };

    const handleContinue = async () => {
        const nextErrors: { name?: string; numPonds?: string; shiftEnd?: string } = {};
        if (!name.trim()) nextErrors.name = t('farms.errorFarmRequired');
        if (canEditShift && shiftEnd.trim() && parseShiftEnd(shiftEnd.trim()) == null) {
            nextErrors.shiftEnd = t('farms.shiftEndInvalid');
        }
        // Pond count is mandatory during first-run owner setup; optional otherwise.
        if (pendingFarmSetup && numPonds < 1) {
            nextErrors.numPonds = t('farms.errorPondCountRequired');
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        setErrors({});

        if (hasPondStep) {
            // Step 2 owns the write — see the header comment.
            navigation.navigate('PondNames', { farm: buildDraft(), pondCount: numPonds });
            return;
        }

        // Renaming or re-siting a farm changes what every member sees; ask
        // first. Creation does not — the reassurance line below covers it.
        if (isEdit) {
            const ok = await confirm({
                title: t('common.confirmEditTitle'),
                message: t('common.confirmEditMessage'),
                confirmLabel: t('common.save'),
                cancelLabel: t('common.cancel'),
            });
            if (!ok) return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                // Only the fields this form owns. PATCHing the whole draft
                // would send plannedPondCount: undefined and quietly clear a
                // figure this screen never shows in edit mode.
                const { plannedPondCount, ...editable } = buildDraft();
                // Shift fields only when changed.
                const shift: Pick<Farm, 'shiftEndLocal' | 'shiftHours'> = {};
                if (canEditShift) {
                    const end = shiftEnd.trim();
                    if (end !== loadedShift.end) {
                        const mins = parseShiftEnd(end);
                        shift.shiftEndLocal = mins == null
                            ? null
                            : `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
                    }
                    if (shiftHours !== loadedShift.hours) shift.shiftHours = shiftHours;
                }
                // The backend keeps every non-shift field owner-only: a manager
                // PATCHing the whole form would be refused even for a shift-only
                // change. Managers send the shift and nothing else.
                // Keyed on 'manager', not "not owner": a role not loaded yet must
                // never silently drop an owner's name/address edits.
                // CAA only when changed, so an older backend never sees it.
                const caa = canEditCaa && caaNo.trim() !== loadedCaa ? { caaRegistrationNo: caaNo.trim() || null } : {};
                const photo = canEditCaa && photoPath !== undefined ? { photoPath } : {};
                await farmsApi.update(editFarmId!, editRole === 'manager' ? shift : { ...editable, ...shift, ...caa, ...photo });
                showToast({ message: t('farms.farmSavedToast', { name: name.trim() }), type: 'success' });
                navigation.goBack();
                return;
            }
            // No ponds declared: this is the entire flow, so save here.
            await farmsApi.create(buildDraft());
            // Banded, never the count: how many farms someone holds is a
            // commercial fact. `existingFarmCount` is already on screen (the
            // "YOUR 4TH FARM" eyebrow), so this costs no request.
            capture(EVENTS.FARM_CREATED, { band: sizeBand(existingFarmCount + 1) });
            showToast({
                message: t('farms.farmCreatedToast', { name: name.trim(), defaultValue: '{{name}} created' }),
                type: 'success',
            });
            if (pendingFarmSetup) completeFarmSetup();
            navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                apiErrorMessage(error, t(isEdit ? 'farms.errorSaveFarm' : 'farms.errorCreateFarm')),
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <ScreenHeader
                eyebrow={isEdit ? name || null : existingFarmCount > 0 ? t('farms.yourNthFarm', { n: existingFarmCount + 1 }) : null}
                title={isEdit ? t('farms.editFarmTitle') : t('farms.stepFarmTitle')}
                onBack={pendingFarmSetup ? undefined : () => navigation.goBack()}
                accessibilityBackLabel={t('common.back')}
                // During the first-run gate there is nothing to go back TO, so
                // the escape is a labelled action, not an arrow.
                actionLabel={pendingFarmSetup ? t('farms.setupLater') : undefined}
                onAction={pendingFarmSetup ? skipSetup : undefined}
                trailing={hasPondStep ? t('farms.stepOfTwo', { n: 1 }) : undefined}
            />

            {hasPondStep && (
                <View style={styles.progress} accessibilityRole="progressbar">
                    <View style={[styles.progressSeg, styles.progressDone]} />
                    <View style={styles.progressSeg} />
                </View>
            )}

            {isHydrating ? (
                <View style={styles.hydrating}>
                    <ActivityIndicator color={theme.roles.light.primary} />
                </View>
            ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Input
                    label={t('farms.fieldFarmName')}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('farms.farmNamePlaceholder')}
                    error={errors.name}
                    required
                />

                {canEditCaa && (
                    <PhotoAttach
                        surface="farm_identity"
                        scope={{ farmId: editFarmId! }}
                        value={photoPath ? [photoPath] : []}
                        onChange={(paths) => setPhotoPath(paths.length ? paths[paths.length - 1] : null)}
                        existingUrls={existingPhoto.url ? [existingPhoto.url] : undefined}
                        existingThumbs={existingPhoto.thumbUrl ? [existingPhoto.thumbUrl] : undefined}
                    />
                )}

                <Input
                    label={t('farms.fieldAreaHectares')}
                    value={totalArea}
                    onChangeText={setTotalArea}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    hint={t('farms.areaHint')}
                />

                {!isEdit && (<>{/* A stepper, not a keyboard. Pond count is a small whole
                    number and the farmer is often outdoors — the design shows
                    − / + controls, and Stepper already implements them to the
                    44dp tap-target rule. */}
                <Stepper
                    label={t('farms.fieldPondCount')}
                    value={numPonds}
                    onChange={setNumPonds}
                    min={0}
                    max={200}
                />
                <Text style={styles.hint}>
                    {hasPondStep ? t('farms.pondsNamedHint', { last: numPonds }) : t('farms.pondsLaterHint')}
                </Text>
                {errors.numPonds ? <Text style={styles.fieldError}>{errors.numPonds}</Text> : null}</>)}

                {/* District — the precision the app actually uses (weather,
                    regional pricing, the disease signal). No permission
                    needed; "Detect" below is an optional shortcut that only
                    ever fills this picker, never shows a raw coordinate. */}
                <Text style={styles.fieldLabel}>{t('farms.fieldDistrict')}</Text>
                <DistrictPicker
                    stateCode={stateCode}
                    districtCode={districtCode}
                    onChange={(s, d) => { setStateCode(s); setDistrictCode(d); }}
                />
                <View style={styles.locationActions}>
                    <TouchableOpacity
                        style={styles.locationActionBtn}
                        onPress={detectDistrict}
                        activeOpacity={0.8}
                        disabled={locating}
                        accessibilityRole="button"
                        accessibilityLabel={t('farms.detectLocation')}
                        accessibilityState={{ disabled: locating, busy: locating }}
                    >
                        <Icon name="location_on" size={18} color={theme.roles.light.primary} />
                        <Text style={styles.locationActionText}>
                            {locating ? t('farms.locating') : t('farms.detectLocation')}
                        </Text>
                    </TouchableOpacity>
                    {(stateCode || coords) && (
                        <TouchableOpacity
                            onPress={clearLocation}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={t('farms.clearLocation')}
                        >
                            <Text style={styles.clearLocationText}>{t('farms.clearLocation')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {canEditCaa && (
                    <Input
                        label={t('farms.fieldCaaNo')}
                        value={caaNo}
                        onChangeText={setCaaNo}
                        hint={t('farms.caaHint')}
                        testID="farm-caa-no"
                    />
                )}

                <Input
                    label={t('farms.fieldAddress')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('farms.placeholderAddress')}
                />

                {/* Water source — context for water-exchange & quality advice. */}
                <Text style={styles.fieldLabel}>{t('farms.fieldWaterSource')}</Text>
                <View style={styles.sourceRow}>
                    {WATER_SOURCES.map((s) => {
                        const active = waterSource === s.key;
                        return (
                            <TouchableOpacity
                                key={s.key}
                                style={[styles.sourceChip, active && styles.sourceChipActive]}
                                onPress={() => setWaterSource(active ? null : s.key)}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={t(`farms.water_${s.key}`)}
                                accessibilityState={{ selected: active }}
                            >
                                <MaterialCommunityIcons
                                    name={s.icon}
                                    size={16}
                                    color={active ? theme.roles.light.primary : theme.roles.light.textSecondary}
                                />
                                <Text numberOfLines={1} style={[styles.sourceLabel, active && { color: theme.roles.light.primary }]}>
                                    {t(`farms.water_${s.key}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {canEditShift && (
                    <>
                        {/* Empty = no farm end time: check-in + shift length (founder Q4). */}
                        <Input
                            label={t('farms.shiftEndLabel')}
                            value={shiftEnd}
                            onChangeText={setShiftEnd}
                            placeholder="18:00"
                            keyboardType="numbers-and-punctuation"
                            hint={t('farms.shiftHint')}
                            error={errors.shiftEnd}
                            testID="farm-shift-end"
                        />
                        <Stepper
                            label={t('farms.shiftHoursLabel')}
                            value={shiftHours}
                            onChange={setShiftHours}
                            min={1}
                            max={16}
                        />
                    </>
                )}

                {/* The farm code is created with the farm — say so here rather
                    than letting the owner discover it on the members screen. */}
                <View style={styles.noteCard}>
                    <Icon name="key" size={20} color={theme.roles.light.primary} />
                    <Text style={styles.noteText}>{t('farms.farmCodeNote')}</Text>
                </View>

                {/* T3.15 — the plan asked for a "confirmation step" on farm
                    creation to discourage junk farms. The design answers it as
                    a reassurance LINE, not a modal: the worry it addresses is
                    "will this replace or affect my existing farms?", and a
                    confirm dialog would add friction without answering that. */}
                {!isEdit && (
                    <Text style={styles.reassurance}>
                    {existingFarmCount > 0
                        ? t('farms.stayOwnerWithOthers', { count: existingFarmCount })
                        : t('farms.stayOwner')}
                </Text>
                )}
            </ScrollView>
            )}

            <View style={styles.footer}>
                <Button
                    title={hasPondStep ? t('common.continue') : isEdit ? t('common.save') : t('farms.saveFarm')}
                    onPress={handleContinue}
                    loading={isLoading}
                />
            </View>
        </ScreenWrapper>
    );
};


const styles = StyleSheet.create({
    hydrating: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    progress: {
        flexDirection: 'row',
        gap: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        paddingBottom: theme.spacing[4],
    },
    progressSeg: {
        flex: 1,
        height: 4,
        borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.borderDefault,
    },
    progressDone: { backgroundColor: theme.roles.light.primary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    hint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary, marginBottom: theme.spacing[4] },
    fieldError: { ...theme.typeScale.bodySmall, color: theme.roles.light.dangerText, marginBottom: theme.spacing[2] },
    noteCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[3],
        padding: theme.spacing[4], borderRadius: theme.radius.md,
        backgroundColor: theme.roles.light.infoBg, marginBottom: theme.spacing[3],
    },
    noteText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.infoText, flex: 1 },
    reassurance: {
        ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary,
    },
    fieldLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[2],
        marginBottom: theme.spacing[2],
    },
    locationActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: theme.spacing[2],
        marginBottom: theme.spacing[4],
    },
    locationActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        minHeight: 44,
    },
    locationActionText: { ...theme.typeScale.labelMedium, color: theme.roles.light.textBrand },
    clearLocationText: { ...theme.typeScale.labelMedium, color: theme.roles.light.textTertiary },
    sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[6] },
    sourceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        minHeight: 44,
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    sourceChipActive: { borderColor: theme.roles.light.primary, backgroundColor: theme.roles.light.infoBg },
    sourceLabel: { ...theme.typeScale.labelSmall, color: theme.roles.light.textSecondary, flexShrink: 1 },
    footer: {
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
    },
});
