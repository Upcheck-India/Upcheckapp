import { registerRootComponent } from 'expo';
import { getRandomValues, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

// Polyfill WebCrypto for Supabase PKCE (sha256) in Expo Go.
// RN's native global.crypto is non-extensible so we must replace the entire object
// via Object.defineProperty to inject crypto.subtle.
const _subtle = {
    digest: async (_algorithm: string, data: ArrayBuffer) => {
        const str = Array.from(new Uint8Array(data))
            .map((b) => String.fromCharCode(b))
            .join('');
        const hex = await digestStringAsync(CryptoDigestAlgorithm.SHA256, str, {
            encoding: 'hex' as any,
        });
        const bytes = hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16));
        return new Uint8Array(bytes).buffer;
    },
};

try {
    Object.defineProperty(globalThis, 'crypto', {
        value: { getRandomValues, subtle: _subtle },
        writable: true,
        configurable: true,
    });
} catch (_e) {
    (globalThis as any).crypto = { getRandomValues, subtle: _subtle };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
