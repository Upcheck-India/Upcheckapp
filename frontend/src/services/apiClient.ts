import { Config } from '../constants/Config';
import { supabase } from './supabase';

const API_BASE_URL = Config.API_BASE_URL;
const LOG = '[apiClient]';

// ─── Get valid Supabase JWT for backend API calls ─────────────────
async function getAccessToken(): Promise<string | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error(LOG, 'getSession() ERROR:', error.message);
    const token = session?.access_token ?? null;
    console.log(LOG, 'getAccessToken() —', token ? `token present (${token.substring(0, 20)}...)` : 'NO TOKEN (user not logged in or session expired)');
    return token;
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
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(LOG, `→ ${method} ${fullUrl} | auth: ${token ? 'Bearer present' : 'NO AUTH HEADER'}`);

    let response = await fetch(fullUrl, {
        method,
        headers: buildHeaders(token),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    console.log(LOG, `← ${method} ${endpoint} | status: ${response.status} ${response.statusText}`);

    // On 401, attempt one Supabase session refresh then retry.
    // NEVER call supabase.auth.signOut() here — that would log the user out.
    if (response.status === 401) {
        console.warn(LOG, '401 received — attempting Supabase session refresh (NOT signing out)');
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) console.error(LOG, 'refreshSession() ERROR:', refreshError.message);
        token = data.session?.access_token ?? null;
        console.log(LOG, 'After refresh — token:', token ? 'present' : 'still null');

        if (token) {
            response = await fetch(fullUrl, {
                method,
                headers: buildHeaders(token),
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            });
            console.log(LOG, `← retry ${method} ${endpoint} | status: ${response.status} ${response.statusText}`);
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || `API Error: ${response.status} ${response.statusText}`;
        console.error(LOG, `ERROR ${method} ${endpoint}:`, msg, '| body:', JSON.stringify(errorData));
        throw new Error(msg);
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
