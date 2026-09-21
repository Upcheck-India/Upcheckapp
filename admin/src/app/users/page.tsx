import Link from 'next/link';
import { ApiError, searchUsers } from '@/lib/directory';

export const dynamic = 'force-dynamic';

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ email?: string; phone?: string; id?: string }>;
}) {
    const { email, phone, id } = await searchParams;
    const hasQuery = !!(email || phone || id);

    let results: Awaited<ReturnType<typeof searchUsers>> = [];
    let error: string | null = null;
    let refused = false;
    if (hasQuery) {
        try {
            results = await searchUsers({ email, phone, id });
        } catch (err) {
            refused = err instanceof ApiError && err.status === 401;
            error = (err as Error).message;
        }
    }

    return (
        <>
            <h1>Users</h1>
            <p className="sub">Exact match only — email, phone, or user id.</p>

            <form className="editor" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="text" defaultValue={email ?? ''} />
                </div>
                <div style={{ flex: 1 }}>
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="text" defaultValue={phone ?? ''} placeholder="+91 98765 43210" />
                </div>
                <div style={{ flex: 1 }}>
                    <label htmlFor="id">User id</label>
                    <input id="id" name="id" type="text" defaultValue={id ?? ''} />
                </div>
                <button type="submit">Search</button>
            </form>

            {error && (
                <p className="error">
                    {refused ? (
                        <>
                            Your admin key was refused — it may have been rotated or revoked.{' '}
                            <Link href="/login">Sign in again</Link>.
                        </>
                    ) : (
                        error
                    )}
                </p>
            )}

            {hasQuery && !error && results.length === 0 && <p className="empty">No match.</p>}

            {results.map((u) => (
                <Link key={u.id} href={`/users/${u.id}`} className="row">
                    <div className="grow">
                        <strong>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</strong>
                        <small>{u.email} · {u.id}</small>
                    </div>
                </Link>
            ))}
        </>
    );
}
