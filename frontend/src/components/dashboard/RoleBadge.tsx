import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { FarmRole } from '../../api/farmMembers';

// A distinct color + icon per role so "what am I on this farm" is unmistakable
// at a glance. The dashboard previously showed the role only as a faint grey
// line under the user's name — identical weight for an owner and a worker,
// which is exactly the owner-vs-worker confusion this badge removes. Owner is
// brand-blue (you own it), worker is green (you work it) — the two roles the
// audience most often mixes up read as clearly different colors.
const ROLE_STYLE: Record<
    FarmRole,
    { bg: string; fg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
    owner: { bg: theme.roles.light.infoBg, fg: theme.roles.light.textBrand, icon: 'crown-outline' },
    manager: { bg: theme.roles.light.surfaceVariant, fg: theme.roles.light.textSecondary, icon: 'account-tie-outline' },
    worker: { bg: theme.roles.light.successBg, fg: theme.roles.light.successText, icon: 'account-hard-hat-outline' },
    viewer: { bg: theme.roles.light.surfaceVariant, fg: theme.roles.light.textTertiary, icon: 'eye-outline' },
};

interface RoleBadgeProps {
    role: FarmRole;
    style?: StyleProp<ViewStyle>;
}

export const RoleBadge = ({ role, style }: RoleBadgeProps) => {
    const { t } = useTranslation();
    const s = ROLE_STYLE[role];
    return (
        <View style={[styles.badge, { backgroundColor: s.bg }, style]}>
            <MaterialCommunityIcons name={s.icon} size={13} color={s.fg} />
            <Text style={[styles.label, { color: s.fg }]} allowFontScaling>
                {t(`members.role_${role}`)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 3,
        borderRadius: theme.radius.full,
    },
    label: {
        ...theme.typeScale.labelSmall,
        fontWeight: '700',
    },
});
