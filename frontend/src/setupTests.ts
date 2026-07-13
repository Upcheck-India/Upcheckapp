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

// GoogleSignin has no native module under Jest — TurboModuleRegistry has
// nothing registered in this environment. authStore.ts imports it (used by
// logout()), which pulls it into every test that transitively imports the
// store, even ones with nothing to do with Google Sign-In. A per-test-file
// jest.mock() (e.g. in useGoogleAuth's own tests) overrides this default.
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn(async () => true),
        signIn: jest.fn(),
        signOut: jest.fn(async () => undefined),
    },
    isSuccessResponse: jest.fn(() => false),
    isErrorWithCode: jest.fn(() => false),
    statusCodes: {
        SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
        IN_PROGRESS: 'IN_PROGRESS',
        PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
}));

// Initialise i18n (English) so components using useTranslation() render real
// strings under test instead of raw keys.
import './i18n';

export {};
