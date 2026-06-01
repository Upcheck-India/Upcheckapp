import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { theme } from '../../theme';
import { LegalBlock } from '../../legal/content';

interface Props {
  title: string;
  blocks: LegalBlock[];
  navigation: any;
}

/**
 * Renders a legal document (Privacy Policy / Terms) as scrollable sections.
 * The authoritative copy lives in src/legal/content.ts and is mirrored to
 * docs/legal/*.md for public hosting.
 */
export const LegalScreen = ({ title, blocks, navigation }: Props) => {
  return (
    <ScreenWrapper scroll={false} padded={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {blocks.map((b, i) => (
          <View key={i} style={styles.block}>
            {b.heading ? <Text style={styles.heading}>{b.heading}</Text> : null}
            <Text style={styles.body}>{b.text}</Text>
          </View>
        ))}
        <View style={{ height: theme.spacing[12] }} />
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.roles.light.borderDefault,
  },
  backBtn: { padding: theme.spacing[4] },
  title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
  content: { padding: theme.spacing[4] },
  block: { marginBottom: theme.spacing[5] },
  heading: {
    ...theme.typeScale.h4,
    color: theme.roles.light.textPrimary,
    marginBottom: theme.spacing[2],
  },
  body: {
    ...theme.typeScale.bodyMedium,
    color: theme.roles.light.textSecondary,
    lineHeight: 22,
  },
});
