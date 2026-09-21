import 'server-only';
import { getAdminKey } from './admin-key';

/** Read-only users/farms lookup — GET /admin/users*, GET /admin/farms*. */

export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

function config() {
    const baseUrl = process.env.UPCHECK_API_URL;
    const key = getAdminKey();
    if (!baseUrl || !key) {
        throw new Error('UPCHECK_API_URL and ADMIN_API_KEY must both be set on this deployment.');
    }
    return { baseUrl: baseUrl.replace(/\/$/, ''), key };
}

async function call<T>(path: string): Promise<T> {
    const { baseUrl, key } = config();
    const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'x-admin-key': key },
        cache: 'no-store',
    });
    if (!res.ok) {
        const detail = await res.text().then(
            (body) => {
                try {
                    return (JSON.parse(body) as { message?: string }).message ?? '';
                } catch {
                    return body.slice(0, 200);
                }
            },
            () => '',
        );
        throw new ApiError(`GET ${path} failed: ${res.status}${detail ? ` — ${detail}` : ''}`, res.status);
    }
    return res.json() as Promise<T>;
}

export interface UserSummary {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
}

export interface UserDetail extends UserSummary {
    phone: string | null;
    authProvider: string;
    createdAt: string;
    lastLoginAt: string | null;
    isActive: boolean;
    verificationLevel: string;
    farms: { farmId: string; farmName: string; role: string; status: string }[];
}

export interface FarmSummary {
    id: string;
    name: string;
    farmCode: string | null;
    userId: string;
}

export interface FarmDetail extends FarmSummary {
    createdAt: string;
    owner: UserSummary | null;
    members: (UserSummary & { role: string; status: string })[];
    ponds: { id: string; name: string; status: string }[];
    cycles: { id: string; name: string; status: string; pondId: string; createdAt: string }[];
    recentActivity: { measurementsLast30d: number | null };
}

export function searchUsers(query: { email?: string; phone?: string; id?: string }): Promise<UserSummary[]> {
    const params = new URLSearchParams();
    if (query.email) params.set('email', query.email);
    if (query.phone) params.set('phone', query.phone);
    if (query.id) params.set('id', query.id);
    if ([...params.keys()].length === 0) return Promise.resolve([]);
    return call<UserSummary[]>(`/admin/users?${params}`);
}

export function getUser(id: string): Promise<UserDetail> {
    return call<UserDetail>(`/admin/users/${id}`);
}

export function searchFarms(name: string): Promise<FarmSummary[]> {
    if (name.trim().length < 3) return Promise.resolve([]);
    return call<FarmSummary[]>(`/admin/farms?name=${encodeURIComponent(name.trim())}`);
}

export function getFarm(id: string): Promise<FarmDetail> {
    return call<FarmDetail>(`/admin/farms/${id}`);
}
