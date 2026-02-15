import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/constants/Colors';
import NetInfo from '@react-native-community/netinfo';
import { sync } from './src/services/sync';

import './src/i18n';
import { AuthProvider } from './src/context/AuthContext';

// Custom theme aligned with icon colors
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.secondary,
    secondaryContainer: Colors.secondaryContainer,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: Colors.text,
    onSurface: Colors.text,
    outline: Colors.border,
    elevation: {
      level1: Colors.surface,
      level2: Colors.surface,
      level3: Colors.surface,
      level4: Colors.surface,
      level5: Colors.surface,
    }
  },
  roundness: 16, // Global roundness
};

import { NetInfoState } from '@react-native-community/netinfo';

export default function App() {
  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable) {
        sync().catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  const linking = {
    prefixes: ['upcheck://', 'exp://'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer linking={linking}>
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
