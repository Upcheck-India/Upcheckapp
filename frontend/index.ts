import { registerRootComponent } from 'expo';
import { getRandomValues, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

// Polyfill WebCrypto for Supabase PKCE (sha256) in Expo Go
if (typeof (global as any).crypto === 'undefined') {
    (global as any).crypto = {};
}
if (!(global as any).crypto.getRandomValues) {
    (global as any).crypto.getRandomValues = getRandomValues;
}
if (!(global as any).crypto.subtle) {
    (global as any).crypto.subtle = {
        digest: async (algorithm: string, data: ArrayBuffer) => {
            const hex = await digestStringAsync(
                CryptoDigestAlgorithm.SHA256,
                Array.from(new Uint8Array(data)).map(b => String.fromCharCode(b)).join(''),
                { encoding: 'hex' as any }
            );
            const bytes = hex.match(/.{1,2}/g)!.map(h => parseInt(h, 16));
            return new Uint8Array(bytes).buffer;
        },
    };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
