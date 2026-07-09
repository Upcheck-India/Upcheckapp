// AUTH-1 — offline cold-start must not log the farmer out. Only a real auth
// rejection (401/403) clears the session; a transient/offline refresh failure
// keeps a usable authenticated-offline state.
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('../../native/TruecallerAuth', () => ({ TruecallerAuth: { clear: jest.fn() } }));
jest.mock('../../api/profiles', () => ({ profilesApi: {} }));
jest.mock('../../api/auth', () => ({ authApi: { refresh: jest.fn() } }));

import { authApi } from '../../api/auth';
import { useAuthStore } from '../authStore';

const mockedRefresh = authApi.refresh as jest.Mock;

const seedPersistedIdentity = () =>
    useAuthStore.setState({
        refreshToken: 'stored-rt',
        userId: 'user-1',
        userEmail: 'ramu@pond.in',
        accessToken: null,
        session: null,
        user: null,
        isAuthenticated: false,
        status: 'initializing',
    } as any);

describe('authStore.initialize (AUTH-1)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('keeps the farmer authenticated (offline) on a transient network failure', async () => {
        seedPersistedIdentity();
        mockedRefresh.mockRejectedValue({ message: 'Network Error' }); // no response

        await useAuthStore.getState().initialize();

        const s = useAuthStore.getState();
        expect(s.isAuthenticated).toBe(true);
        expect(s.status).toBe('authenticated');
        expect(s.accessToken).toBeNull();     // tokenless — refreshes on reconnect
        expect(s.user?.id).toBe('user-1');
    });

    it('logs the farmer out on a real 401 (revoked/expired token)', async () => {
        seedPersistedIdentity();
        mockedRefresh.mockRejectedValue({ response: { status: 401 } });

        await useAuthStore.getState().initialize();

        const s = useAuthStore.getState();
        expect(s.isAuthenticated).toBe(false);
        expect(s.status).toBe('unauthenticated');
    });

    it('shows login when there is no stored refresh token', async () => {
        useAuthStore.setState({ refreshToken: null, userId: undefined } as any);

        await useAuthStore.getState().initialize();

        expect(useAuthStore.getState().status).toBe('unauthenticated');
        expect(mockedRefresh).not.toHaveBeenCalled();
    });
});
