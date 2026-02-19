import Constants from 'expo-constants';

/**
 * Set USE_LOCAL_BACKEND = true to hit your local NestJS server (requires
 * Windows Firewall to allow port 8080 from LAN — see README).
 * Set USE_LOCAL_BACKEND = false to always use the Render cloud backend.
 */
const USE_LOCAL_BACKEND = false;

function getApiBaseUrl(): string {
    const renderUrl = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://upcheckapp-c612.onrender.com/api';

    if (__DEV__ && USE_LOCAL_BACKEND) {
        const hostUri = Constants.expoConfig?.hostUri as string | undefined;
        if (hostUri) {
            const host = hostUri.split(':')[0];
            const url = `http://${host}:8080/api`;
            console.log('[Config] DEV+LOCAL mode — API_BASE_URL:', url);
            return url;
        }
    }

    console.log('[Config] Using Render backend — API_BASE_URL:', renderUrl);
    return renderUrl;
}

export const Config = {
    API_BASE_URL: getApiBaseUrl(),
};
