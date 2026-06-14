import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

interface PrefilledBannerProps {
  /** Day of culture, if known. */
  doc?: number | null;
  /** ISO timestamp of the latest reading used. */
  recordedAt?: string | null;
}

/**
 * Subtle banner shown when an engine screen has auto-filled its inputs from the
 * farmer's latest logs — so they know the numbers came from their own data and
 * can still adjust.
 */
export const PrefilledBanner: React.FC<PrefilledBannerProps> = ({ doc }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="autorenew" size={16} color={theme.roles.light.infoText} />
      <Text style={styles.text}>
        {doc != null ? t('engines.common.prefilledDoc', { doc }) : t('engines.common.prefilled')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.roles.light.infoBg,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  text: { ...theme.typeScale.bodySmall, color: theme.roles.light.infoText, flex: 1 },
});

export default PrefilledBanner;
