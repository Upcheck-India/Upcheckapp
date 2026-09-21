'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_KEY_COOKIE } from '@/lib/admin-key';

export interface SignInState {
    error?: string;
}

/**
 * Validates a pasted key against the backend (GET /admin/whoami — the same
 * AdminKeyGuard every other admin route uses) before trusting it, then
 * stores it httpOnly/Secure/SameSite=Strict for 8 hours. The cookie holds
 * the staffer's own key, never a dashboard-wide secret — see lib/admin-key.ts.
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
    const key = String(formData.get('key') ?? '').trim();
    if (!key) return { error: 'Enter your admin key.' };

    const baseUrl = process.env.UPCHECK_API_URL;
    if (!baseUrl) {
        return { error: 'UPCHECK_API_URL is not set on this deployment.' };
    }

    let res: Response;
    try {
        res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/whoami`, {
            headers: { 'x-admin-key': key },
            cache: 'no-store',
        });
    } catch {
        return { error: 'Could not reach the Upcheck API.' };
    }

    if (!res.ok) {
        return { error: 'That key was not recognised.' };
    }

    const body = (await res.json().catch(() => null)) as { staff?: string } | null;
    if (!body?.staff) {
        return { error: 'That key was not recognised.' };
    }

    const store = await cookies();
    store.set(ADMIN_KEY_COOKIE, key, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 8 * 60 * 60,
        path: '/',
    });

    redirect('/');
}

export async function signOut(): Promise<void> {
    const store = await cookies();
    store.delete(ADMIN_KEY_COOKIE);
    redirect('/login');
}
