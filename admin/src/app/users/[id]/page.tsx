import Link from 'next/link';
import { ApiError, getUser } from '@/lib/directory';
import { formatWhen } from '@/lib/feedback';
import { formatBytes } from '@/lib/overview';
import { getUserStorage, type UserStorage } from '@/lib/storage-quota';
import { saveLimit, clearLimit } from './storage-actions';

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

    // Best-effort: the storage ledger may not be migrated yet — a user page
    // that fails to render over that is worse than one that just omits it.
    const storage: UserStorage | null = await getUserStorage(id).catch(() => null);
    const save = saveLimit.bind(null, id);
    const clear = clearLimit.bind(null, id);

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

            <h2>Photo storage</h2>
            {!storage ? (
                <p className="empty"><small>Storage usage isn&apos;t available yet (not migrated).</small></p>
            ) : (
                <>
                    <p>
                        <small>Photos</small><br />
                        {storage.photos} / {storage.limits.photos}
                        {storage.incomplete && ' (incomplete — pre-storage-ledger photos not yet counted)'}
                    </p>
                    <p>
                        <small>Storage</small><br />
                        {formatBytes(storage.bytes)} / {formatBytes(storage.limits.bytes)}
                    </p>

                    {storage.farms.length > 0 && (
                        <>
                            <h3>Per farm / pond</h3>
                            {storage.farms.map((f) => (
                                <div key={f.farmId} style={{ marginBottom: 8 }}>
                                    <strong>{f.name ?? '(unnamed farm)'}</strong>
                                    <small> — {f.photos} photos, {formatBytes(f.bytes)}</small>
                                    {f.ponds.map((p) => (
                                        <p key={p.pondId ?? 'farm-level'} className="sub" style={{ marginLeft: 16 }}>
                                            <small>
                                                {p.name ?? '(farm-level)'}: {p.photos} photos, {formatBytes(p.bytes)}
                                            </small>
                                        </p>
                                    ))}
                                </div>
                            ))}
                        </>
                    )}

                    {storage.override ? (
                        <p className="sub">
                            <small>
                                Custom limit active — set by {storage.override.setBy} on{' '}
                                {formatWhen(storage.override.setAt)}: &ldquo;{storage.override.reason}&rdquo;
                            </small>
                        </p>
                    ) : (
                        <p className="sub"><small>Default limit — no override.</small></p>
                    )}

                    <h3>Change limit</h3>
                    <form action={save} className="editor">
                        <div>
                            <label htmlFor="maxPhotos">Max photos</label>
                            <input
                                id="maxPhotos"
                                name="maxPhotos"
                                type="number"
                                min={1}
                                max={100000}
                                defaultValue={storage.override?.maxPhotos ?? storage.limits.photos}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="maxBytesGb">Max storage (GB)</label>
                            <input
                                id="maxBytesGb"
                                name="maxBytesGb"
                                type="number"
                                min={0.001}
                                max={200}
                                step="0.1"
                                defaultValue={
                                    Math.round(((storage.override?.maxBytes ?? storage.limits.bytes) / 1024 ** 3) * 100) / 100
                                }
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="reason">Reason (required — kept for audit)</label>
                            <textarea id="reason" name="reason" maxLength={500} required />
                        </div>
                        <p className="sub">
                            <small>
                                Lowering below current usage is allowed — new uploads are refused until the
                                account frees space, existing photos are never touched.
                            </small>
                        </p>
                        <button type="submit">Save limit</button>
                    </form>

                    {storage.override && (
                        <form action={clear} className="editor">
                            <div>
                                <label htmlFor="resetReason">Reason for resetting to the default</label>
                                <textarea id="resetReason" name="resetReason" maxLength={500} required />
                            </div>
                            <button type="submit" className="secondary">Reset to default</button>
                        </form>
                    )}

                    {storage.history.length > 0 && (
                        <>
                            <h3>Limit history</h3>
                            {storage.history.map((h, i) => (
                                <p key={i} className="sub">
                                    <small>
                                        {formatWhen(h.createdAt)} · {h.setBy} · {h.action}
                                        {h.action === 'set' ? ` — ${h.maxPhotos} photos / ${formatBytes(h.maxBytes ?? 0)}` : ''}
                                        {' — '}&ldquo;{h.reason}&rdquo;
                                    </small>
                                </p>
                            ))}
                        </>
                    )}
                </>
            )}
        </>
    );
}
