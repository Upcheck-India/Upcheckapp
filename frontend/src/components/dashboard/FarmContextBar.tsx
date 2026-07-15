import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { RoleBadge } from './RoleBadge';
import { theme } from '../../theme';
import { useMembershipStore } from '../../store/membershipStore';
import { useActiveFarmStore } from '../../store/activeFarmStore';

// The single "which farm am I on, and what's my role here?" affordance at the
// top of Home. Before this the dashboard silently auto-picked the user's first
// farm with no on-screen indication of which one was shown or any way to
// switch — so an owner of three farms and a worker on one saw a nearly
// identical greeting with no context. A member of more than one farm gets an
// inline switcher (each farm tagged with the user's role there); a
// single-farm member just gets the labelled context, with no misleading
// chevron to tap.
export const FarmContextBar = () => {
    const { t } = useTranslation();
    const selectedFarm = useActiveFarmStore((s) => s.selectedFarm);
    const setSelectedFarm = useActiveFarmStore((s) => s.setSelectedFarm);
    const memberships = useMembershipStore((s) => s.memberships);
    const roleForFarm = useMembershipStore((s) => s.roleForFarm);
    const [open, setOpen] = useState(false);

    if (!selectedFarm?.id) return null;
    const role = roleForFarm(selectedFarm.id);
    const canSwitch = memberships.length > 1;

    return (
        <View style={styles.wrap}>
            <TouchableOpacity
                activeOpacity={canSwitch ? 0.7 : 1}
                disabled={!canSwitch}
                onPress={() => setOpen((v) => !v)}
                style={styles.bar}
                accessibilityRole={canSwitch ? 'button' : undefined}
                accessibilityLabel={
                    canSwitch ? t('home.switchFarmA11y', { farm: selectedFarm.name }) : undefined
                }
            >
                <MaterialCommunityIcons name="barn" size={20} color={theme.roles.light.primary} />
                <Text style={styles.farmName} numberOfLines={1} allowFontScaling>
                    {selectedFarm.name}
                </Text>
                {role ? <RoleBadge role={role} /> : null}
                {canSwitch ? (
                    <MaterialCommunityIcons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.roles.light.textSecondary}
                    />
                ) : null}
            </TouchableOpacity>

            {open && canSwitch && (
                <Card style={styles.dropdown}>
                    {memberships.map((m) => {
                        const active = m.farmId === selectedFarm.id;
                        return (
                            <TouchableOpacity
                                key={m.farmId}
                                style={[styles.option, active && styles.optionActive]}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (!active && m.farm) {
                                        setSelectedFarm({ id: m.farm.id, name: m.farm.name });
                                    }
                                    setOpen(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={m.farm?.name ?? undefined}
                            >
                                <MaterialCommunityIcons
                                    name={active ? 'check-circle' : 'circle-outline'}
                                    size={18}
                                    color={active ? theme.roles.light.primary : theme.roles.light.textTertiary}
                                />
                                <Text
                                    style={[styles.optionText, active && styles.optionTextActive]}
                                    numberOfLines={1}
                                    allowFontScaling
                                >
                                    {m.farm?.name ?? t('home.farmerFallback')}
                                </Text>
                                <RoleBadge role={m.role} />
                            </TouchableOpacity>
                        );
                    })}
                </Card>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { marginBottom: theme.spacing[6] },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    farmName: {
        flex: 1,
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '700',
    },
    dropdown: {
        marginTop: theme.spacing[2],
        padding: theme.spacing[2],
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[2],
        borderRadius: theme.radius.md,
    },
    optionActive: { backgroundColor: theme.roles.light.surfaceOverlay },
    optionText: {
        flex: 1,
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textPrimary,
    },
    optionTextActive: { fontWeight: '700', color: theme.roles.light.textBrand },
});
