import Constants from 'expo-constants';

/**
 * In Expo Go / dev, Constants.expoConfig.hostUri is the Metro bundler address,
 * e.g. "192.168.1.7:8081".  Extract the IP and use port 8080 for the backend
 * so all API calls hit your local NestJS server, not Render.
 *
 * In a production build (no hostUri), fall back to the Render URL from app.json.
 */
function getApiBaseUrl(): string {
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri as string | undefined;
        if (hostUri) {
            const host = hostUri.split(':')[0]; // "192.168.1.7"
            const url = `http://${host}:8080/api`;
            console.log('[Config] DEV mode — API_BASE_URL:', url);
            return url;
        }
    }
    const prodUrl = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://upcheckapp-c612.onrender.com/api';
    console.log('[Config] PROD mode — API_BASE_URL:', prodUrl);
    return prodUrl;
}

export const Config = {
    API_BASE_URL: getApiBaseUrl(),
};
