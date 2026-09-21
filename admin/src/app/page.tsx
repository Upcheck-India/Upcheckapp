import { ApiError, formatBytes, getOverview } from '@/lib/overview';

/**
 * The dashboard home page — read-only aggregate numbers, no per-user data.
 * A Server Component, same reasoning as the reports inbox: the fetch (and
 * ADMIN_API_KEY) stays on the server.
 */
export const dynamic = 'force-dynamic';

function Stat({ label, value }: { label: string; value: string | number | null }) {
    return (
        <div className="row" style={{ cursor: 'default' }}>
            <div className="grow">
                <strong>{value === null ? '—' : value}</strong>
                <small>{label}{value === null ? ' (not migrated yet)' : ''}</small>
            </div>
        </div>
    );
}

export default async function OverviewPage() {
    let overview;
    try {
        overview = await getOverview();
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401;
        return (
            <>
                <h1>Overview</h1>
                <p className="error">
                    {refused ? (
                        <>
                            The Upcheck API refused this dashboard. Set <code>ADMIN_API_KEY</code>{' '}
                            on the backend (Render) and here, to the same value.
                        </>
                    ) : (
                        <>
                            Could not reach the Upcheck API. Check <code>UPCHECK_API_URL</code> on
                            this deployment.
                        </>
                    )}
                    <br />
                    <small>{(err as Error).message}</small>
                </p>
            </>
        );
    }

    const maxLogs = Math.max(1, ...overview.logsPerDay.map((d) => d.count));

    return (
        <>
            <h1>Overview</h1>
            <p className="sub">Aggregate numbers only — nothing here is scoped to one farmer.</p>

            <h2>Sign-ups</h2>
            <Stat label="Today" value={overview.signups?.today ?? null} />
            <Stat label="Last 7 days" value={overview.signups?.last7d ?? null} />
            <Stat label="Last 30 days" value={overview.signups?.last30d ?? null} />
            <Stat label="Total" value={overview.signups?.total ?? null} />

            <h2>Farms &amp; ponds</h2>
            <Stat label="Active farms (of total)" value={overview.farms ? `${overview.farms.active} / ${overview.farms.total}` : null} />
            <Stat label="Active ponds (of total)" value={overview.ponds ? `${overview.ponds.active} / ${overview.ponds.total}` : null} />
            <Stat label="Active cycles" value={overview.cycles?.active ?? null} />

            <h2>Logs per day (last 14 days)</h2>
            {overview.logsPerDay.length === 0 ? (
                <p className="empty">No log data yet (or not migrated).</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {overview.logsPerDay.map((d) => (
                        <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <span style={{ width: 88, color: 'var(--muted)' }}>{d.date}</span>
                            <div
                                style={{
                                    background: 'var(--text)',
                                    height: 12,
                                    borderRadius: 2,
                                    width: `${Math.max(2, (d.count / maxLogs) * 100)}%`,
                                }}
                            />
                            <span>{d.count}</span>
                        </div>
                    ))}
                </div>
            )}

            <h2>Support &amp; storage</h2>
            <Stat label="Open feedback reports" value={overview.feedback?.open ?? null} />
            <Stat label="Pending photo deletions" value={overview.photoDeletions?.pending ?? null} />
            <Stat label="Failed photo deletions (≥5 attempts)" value={overview.photoDeletions?.failed ?? null} />
            {overview.storage ? (
                <>
                    <Stat label="Stored photo objects" value={overview.storage.objectCount} />
                    <Stat label="Total storage used" value={formatBytes(overview.storage.totalBytes)} />
                </>
            ) : (
                <p className="empty"><small>Storage totals show up once the photo-storage table exists.</small></p>
            )}
        </>
    );
}
