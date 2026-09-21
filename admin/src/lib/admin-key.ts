import 'server-only';
import { cookies } from 'next/headers';

/**
 * C5.1: no more dashboard-wide ADMIN_API_KEY. Staff sign in at /login with
 * their own personal admin key (see login/actions.ts), which lands in this
 * httpOnly cookie; middleware.ts redirects every other route to /login when
 * it's absent. Every server-only API client in src/lib/*.ts reads the key
 * through getAdminKey() — never process.env — so each request the dashboard
 * makes carries the signed-in staffer's own key, and the backend's
 * admin_access_log names them, not "the dashboard".
 *
 * Keep this exact path/name (`@/lib/admin-key`, `getAdminKey`) — it's the
 * documented way any new admin page reads the key.
 */
export const ADMIN_KEY_COOKIE = 'admin_key';

export async function getAdminKey(): Promise<string> {
  const store = await cookies();
  const key = store.get(ADMIN_KEY_COOKIE)?.value;
  if (!key) {
    // middleware.ts already redirects every route but /login when this
    // cookie is missing, so reaching here means it expired between that
    // check and this read. Fail loudly rather than let a caller send a
    // request with an empty x-admin-key.
    throw new Error('Not signed in — no admin key. Sign in again at /login.');
  }
  return key;
}

/**
 * For the layout header ("signed in as ..."). Unlike getAdminKey(), this
 * never throws — no cookie, no reachable API, or a stale key all just mean
 * "don't show a name", which is fine for a header and lets `/login` itself
 * render inside the same layout without a cookie present yet.
 */
export async function getCurrentStaffName(): Promise<string | null> {
  const store = await cookies();
  const key = store.get(ADMIN_KEY_COOKIE)?.value;
  const baseUrl = process.env.UPCHECK_API_URL;
  if (!key || !baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/whoami`, {
      headers: { 'x-admin-key': key },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { staff?: string };
    return body.staff ?? null;
  } catch {
    return null;
  }
}
