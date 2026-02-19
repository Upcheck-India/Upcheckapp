import { Config } from '../constants/Config';
import { supabase } from './supabase';

const API_BASE_URL = Config.API_BASE_URL;

// ─── Get valid Supabase JWT for backend API calls ─────────────────
// If the token is close to expiry, Supabase auto-refreshes it.
async function getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

function buildHeaders(token: string | null): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── Core request — uses Supabase JWT, retries once after refresh ─
async function request(method: string, endpoint: string, body?: any): Promise<any> {
    let token = await getAccessToken();

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: buildHeaders(token),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    // On 401, attempt one Supabase session refresh then retry.
    // NEVER call supabase.auth.signOut() here — that would log the user out.
    if (response.status === 401) {
        const { data } = await supabase.auth.refreshSession();
        token = data.session?.access_token ?? null;

        if (token) {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: buildHeaders(token),
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            });
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json();
    }
    return {};
}

// ═══════════════════════════════════════════════════════════════════
// ─── API Client ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export const apiClient = {
    get: (endpoint: string) => request('GET', endpoint),
    post: (endpoint: string, body?: any) => request('POST', endpoint, body),
    patch: (endpoint: string, body?: any) => request('PATCH', endpoint, body),
    put: (endpoint: string, body?: any) => request('PUT', endpoint, body),
    delete: (endpoint: string, body?: any) => request('DELETE', endpoint, body),
};
