import Link from 'next/link';
import { ApiError, getUser } from '@/lib/directory';
import { formatWhen } from '@/lib/feedback';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let user;
    try {
        user = await getUser(id);
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401;
        return (
            <>
                <p><Link href="/users">← Users</Link></p>
                <p className="error">
                    {refused ? (
                        <>
                            Your admin key was refused — it may have been rotated or revoked.{' '}
                            <Link href="/login">Sign in again</Link>.
                        </>
                    ) : (
                        <>Could not load this user. {(err as Error).message}</>
                    )}
                </p>
            </>
        );
    }

    return (
        <>
            <p><Link href="/users">← Users</Link></p>

            <h1>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</h1>
            <p className="sub">{user.email} · {user.id}</p>

            <h2>Account</h2>
            <p><small>Phone</small><br />{user.phone ?? '—'}</p>
            <p><small>Sign-in provider</small><br />{user.authProvider}</p>
            <p><small>Created</small><br />{formatWhen(user.createdAt)}</p>
            <p><small>Last activity</small><br />{user.lastLoginAt ? formatWhen(user.lastLoginAt) : 'never'}</p>
            <p><small>Status</small><br />{user.isActive ? 'active' : 'deactivated'} · {user.verificationLevel}</p>

            <h2>Farms ({user.farms.length})</h2>
            {user.farms.length === 0 ? (
                <p className="empty">No farm memberships.</p>
            ) : (
                user.farms.map((f) => (
                    <Link key={f.farmId} href={`/farms/${f.farmId}`} className="row">
                        <div className="grow">
                            <strong>{f.farmName}</strong>
                            <small>{f.role} · {f.status}</small>
                        </div>
                    </Link>
                ))
            )}
        </>
    );
}
