/**
 * LanguagePill — a compact language selector usable on pre-auth screens
 * (Login / Register / Truecaller) where the full Settings switcher isn't
 * reachable yet. Renders a globe chip showing the current language's endonym;
 * tapping opens a modal list of all supported languages.
 *
 * It only calls `i18n.changeLanguage`, which is patched in src/i18n to persist
 * the choice to AsyncStorage — so the selection carries into the authenticated
 * app. No authentication state is touched.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { LANGUAGES } from '../../i18n/languages';
import { theme } from '../../theme';

interface Props {
  /** 'light' for placement on a coloured/primary background (white chip);
   *  'dark' for placement on a surface background (default). */
  variant?: 'light' | 'dark';
}

export const LanguagePill = ({ variant = 'dark' }: Props) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [open, setOpen] = useState(false);

  const current =
    LANGUAGES.find((l) => l.code === i18nInstance.language) ?? LANGUAGES[0];
  const light = variant === 'light';
  const fg = light ? theme.roles.light.textInverse : theme.roles.light.textPrimary;
  const border = light ? 'rgba(255,255,255,0.5)' : theme.roles.light.borderDefault;

  const choose = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { borderColor: border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('settings.language')}
      >
        <MaterialCommunityIcons name="web" size={16} color={fg} />
        <Text style={[styles.pillText, { color: fg }]}>{current.nativeLabel}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={fg} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('settings.language')}</Text>
            {LANGUAGES.map((lang) => {
              const active = lang.code === i18nInstance.language;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => choose(lang.code)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionNative, active && styles.optionTextActive]}>
                      {lang.nativeLabel}
                    </Text>
                    <Text style={styles.optionLabel}>{lang.label}</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={theme.roles.light.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  pillText: { ...theme.typeScale.labelMedium, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.roles.light.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    gap: theme.spacing[2],
  },
  sheetTitle: {
    ...theme.typeScale.overline,
    color: theme.roles.light.textTertiary,
    marginBottom: theme.spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.roles.light.borderDefault,
  },
  optionActive: {
    borderColor: theme.roles.light.primary,
    backgroundColor: theme.roles.light.surfaceOverlay,
  },
  optionNative: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
  optionTextActive: { color: theme.roles.light.primary },
  optionLabel: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary },
});

export default LanguagePill;
