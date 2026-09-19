/**
 * Route guard for a remote flag. Entry points are hidden when a flag is off,
 * but a deep link, a notification or a stale back stack can still land on the
 * route — this renders a short "not available" state with a way back instead.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './ui/EmptyState';
import { useFlag, type RemoteFlagKey } from '../features/remoteFlags';
import { theme } from '../theme';

export const FeatureUnavailable: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    return (
        <View style={styles.fill} testID="feature-unavailable">
            <EmptyState
                icon="lock-outline"
                title={t('common.featureUnavailable')}
                subtitle={t('common.featureUnavailableBody')}
                actionLabel={t('common.back')}
                onAction={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainApp'))}
            />
        </View>
    );
};

// Memoised: React Navigation calls `getComponent()` on every render, and a new
// component type each time would remount the screen and lose its state.
const guards = new Map<string, WeakMap<React.ComponentType<any>, React.FC<any>>>();

/** Wrap a screen component so it only renders while `flag` is on. */
// `any` props: screens here take navigator-injected route/navigation props.
export function withFlag(flag: RemoteFlagKey, Screen: React.ComponentType<any>): React.FC<any> {
    let byScreen = guards.get(flag);
    if (!byScreen) guards.set(flag, (byScreen = new WeakMap()));
    let Guarded = byScreen.get(Screen);
    if (!Guarded) {
        Guarded = (props: any) => (useFlag(flag) ? <Screen {...props} /> : <FeatureUnavailable />);
        Guarded.displayName = `withFlag(${flag})`;
        byScreen.set(Screen, Guarded);
    }
    return Guarded;
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: theme.roles.light.background },
});
