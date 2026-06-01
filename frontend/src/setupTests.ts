// Jest setup hooks. Add global test configuration here as needed.

// NetInfo has no native module under jest; use the library's official mock so
// components that subscribe to connectivity (e.g. OfflineIndicator) can render.
jest.mock('@react-native-community/netinfo', () =>
    require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// AsyncStorage (used by syncStore persistence + i18n language persistence) also
// needs its jest mock; without it any screen that renders OfflineIndicator throws.
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Initialise i18n (English) so components using useTranslation() render real
// strings under test instead of raw keys.
import './i18n';

export {};
