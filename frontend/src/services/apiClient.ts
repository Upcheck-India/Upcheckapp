import { Config } from '../constants/Config';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = Config.API_BASE_URL;

// ─── Token refresh lock to prevent concurrent refresh calls ──────
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function getValidAccessToken(): Promise<string | null> {
    const { accessToken, refreshAccessToken } = useAuthStore.getState();

    if (accessToken) {
        // Quick check: is the JWT likely expired? (decode exp without library)
        try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const expiresAt = payload.exp * 1000;
            // Refresh if token expires within 60 seconds
            if (expiresAt - Date.now() > 60_000) {
                return accessToken;
            }
        } catch {
            // If decode fails, use the token as-is and let the server decide
            return accessToken;
        }
    }

    // Token is expired or missing — attempt refresh
    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

function getAuthHeaders(token: string | null) {
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// ─── Request with automatic retry on 401 ─────────────────────────
async function request(method: string, endpoint: string, body?: any): Promise<any> {
    let token = await getValidAccessToken();
    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: getAuthHeaders(token),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    // If 401, try refreshing token once and retry
    if (response.status === 401) {
        const { refreshAccessToken } = useAuthStore.getState();
        token = await refreshAccessToken();

        if (token) {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: getAuthHeaders(token),
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            });
        }
    }

    // If still unauthorized after refresh, force logout
    if (response.status === 401) {
        const { logout } = useAuthStore.getState();
        await logout();
        throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return {};
}

// ═══════════════════════════════════════════════════════════════════
// ─── API Client with auto token refresh ───────────────────────────
// ═══════════════════════════════════════════════════════════════════
export const apiClient = {
    get: (endpoint: string) => request('GET', endpoint),
    post: (endpoint: string, body?: any) => request('POST', endpoint, body),
    patch: (endpoint: string, body?: any) => request('PATCH', endpoint, body),
    put: (endpoint: string, body?: any) => request('PUT', endpoint, body),
    delete: (endpoint: string, body?: any) => request('DELETE', endpoint, body),
};
