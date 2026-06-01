import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalScreen } from './LegalScreen';
import { PRIVACY_POLICY } from '../../legal/content';

export const PrivacyPolicyScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  return <LegalScreen title={t('settings.privacyPolicy')} blocks={PRIVACY_POLICY} navigation={navigation} />;
};
