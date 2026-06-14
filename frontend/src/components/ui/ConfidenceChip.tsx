import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DataConfidence } from '../../api/pondContext';

interface ConfidenceChipProps {
  confidence: DataConfidence;
  /** Show the "raise these to improve" hint below the chip. */
  showHint?: boolean;
}

const MAP = {
  high: { fg: theme.roles.light.successText, bg: theme.roles.light.successBg, icon: 'signal-cellular-3' as const },
  medium: { fg: theme.roles.light.warningText, bg: theme.roles.light.warningBg, icon: 'signal-cellular-2' as const },
  low: { fg: theme.roles.light.dangerText, bg: theme.roles.light.dangerBg, icon: 'signal-cellular-1' as const },
};

/**
 * Shows how much real, current data backs an engine's output. Builds trust and
 * nudges the farmer to log what's missing (the weekly chemistry especially).
 */
export const ConfidenceChip: React.FC<ConfidenceChipProps> = ({ confidence, showHint }) => {
  const { t } = useTranslation();
  const s = MAP[confidence.band] ?? MAP.medium;
  const improve = [...confidence.missing, ...confidence.stale];
  return (
    <View>
      <View style={[styles.chip, { backgroundColor: s.bg }]}>
        <MaterialCommunityIcons name={s.icon} size={14} color={s.fg} />
        <Text numberOfLines={1} style={[styles.label, { color: s.fg }]}>
          {t(`engines.common.${confidence.band}`)} {t('engines.common.confidence')} · {confidence.score}%
        </Text>
      </View>
      {showHint && improve.length > 0 && (
        <Text style={styles.hint}>{t('engines.common.improveHint', { items: improve.slice(0, 3).join(', ') })}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
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
  hint: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary, marginTop: theme.spacing[1] },
});

export default ConfidenceChip;
