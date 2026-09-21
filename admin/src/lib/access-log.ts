import 'server-only';
import { getAdminKey } from './admin-key';

/**
 * C5.1: the audit trail of admin access to farmer data. Same server-only
 * fetch story as lib/feedback.ts — see that file for why.
 */

export interface AccessLogRow {
    id: string;
    staffName: string;
    method: string;
    route: string;
    subjectType: string | null;
    subjectId: string | null;
    ip: string | null;
    status: number;
    createdAt: string;
}

function baseUrl() {
    const url = process.env.UPCHECK_API_URL;
    if (!url) {
        throw new Error('UPCHECK_API_URL must be set on this deployment.');
    }
    return url.replace(/\/$/, '');
}

export async function listAccessLog(before?: string): Promise<AccessLogRow[]> {
    const key = await getAdminKey();
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', '100');
    const res = await fetch(`${baseUrl()}/admin/access-log?${params}`, {
        headers: { 'x-admin-key': key },
        cache: 'no-store',
    });
    if (!res.ok) {
        throw new Error(`GET /admin/access-log failed: ${res.status}`);
    }
    return res.json() as Promise<AccessLogRow[]>;
}

export const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
