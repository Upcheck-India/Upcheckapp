import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

export type Severity = 'low' | 'watch' | 'critical' | 'info' | 'success' | 'warning';

interface SeverityPillProps {
  severity: Severity;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

const MAP: Record<Severity, { fg: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  low: { fg: theme.roles.light.successText, bg: theme.roles.light.successBg, icon: 'check-circle-outline' },
  success: { fg: theme.roles.light.successText, bg: theme.roles.light.successBg, icon: 'check-circle-outline' },
  info: { fg: theme.roles.light.infoText, bg: theme.roles.light.infoBg, icon: 'information-outline' },
  watch: { fg: theme.roles.light.warningText, bg: theme.roles.light.warningBg, icon: 'alert-outline' },
  warning: { fg: theme.roles.light.warningText, bg: theme.roles.light.warningBg, icon: 'alert-outline' },
  critical: { fg: theme.roles.light.dangerText, bg: theme.roles.light.dangerBg, icon: 'alert-octagon-outline' },
};

/** A compact, colour-coded status pill with a vector icon (no emoji). */
export const SeverityPill: React.FC<SeverityPillProps> = ({ severity, label, icon }) => {
  const s = MAP[severity] ?? MAP.info;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <MaterialCommunityIcons name={icon ?? s.icon} size={14} color={s.fg} />
      <Text numberOfLines={1} style={[styles.label, { color: s.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
  },
  label: { ...theme.typeScale.labelSmall, fontWeight: '700', flexShrink: 1 },
});

export default SeverityPill;
