import Link from 'next/link';
import { ApiError, getTopStorageUsers } from '@/lib/storage-quota';
import { formatBytes } from '@/lib/overview';

export const dynamic = 'force-dynamic';

/**
 * Admin photo-quota management (item 1): top 50 accounts by bytes used.
 * Numbers only — no photo viewing, no photo paths — the owner's scope for
 * this feature. Links to /users/:id, whose storage section has the
 * per-farm/pond breakdown and the limit override.
 */
export default async function StoragePage() {
    let users;
    try {
        users = await getTopStorageUsers();
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401;
        return (
            <>
                <h1>Storage</h1>
                <p className="error">
                    {refused ? (
                        <>
                            Your admin key was refused — it may have been rotated or revoked.{' '}
                            <Link href="/login">Sign in again</Link>.
                        </>
                    ) : (
                        <>Could not load storage usage. {(err as Error).message}</>
                    )}
                </p>
            </>
        );
    }

    return (
        <>
            <h1>Storage</h1>
            <p className="sub">Top {users.length} accounts by bytes used.</p>

            {users.length === 0 ? (
                <p className="empty">No photo usage yet (or the storage ledger isn&apos;t migrated).</p>
            ) : (
                users.map((u) => (
                    <Link key={u.userId} href={`/users/${u.userId}`} className="row">
                        <div className="grow">
                            <strong>{u.email}</strong>
                            <small>
                                {formatBytes(u.bytes)} of {formatBytes(u.limits.bytes)} ({u.percentOfLimit}%)
                                {' · '}
                                {u.photos} / {u.limits.photos} photos
                                {u.overridden ? ' · custom limit' : ''}
                            </small>
                        </div>
                    </Link>
                ))
            )}
        </>
    );
}
