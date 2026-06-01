import apiClient from './client';

export const pushApi = {
    /** Register this device's Expo push token against the signed-in user. */
    registerToken: (token: string) => apiClient.post('/push/register', { token }),

    /** Clear the device token (e.g. on sign-out). */
    unregister: () => apiClient.delete('/push/register'),
};
