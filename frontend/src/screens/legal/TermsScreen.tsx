import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalScreen } from './LegalScreen';
import { TERMS } from '../../legal/content';

export const TermsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  return <LegalScreen title={t('settings.termsOfService')} blocks={TERMS} navigation={navigation} />;
};
