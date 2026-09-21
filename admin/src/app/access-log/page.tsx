import { listAccessLog, formatWhen } from '@/lib/access-log';

/**
 * C5.1: "surface it, so the log is looked at rather than merely kept."
 * No filters, no pagination UI yet — 100 most recent rows is enough for
 * staff to notice something wrong; add `before`-cursor paging if this page
 * gets used enough that 100 stops being enough.
 */
export const dynamic = 'force-dynamic';

export default async function AccessLogPage() {
    let rows;
    try {
        rows = await listAccessLog();
    } catch (err) {
        return (
            <>
                <h1>Access log</h1>
                <p className="error">Could not load the access log. {(err as Error).message}</p>
            </>
        );
    }

    return (
        <>
            <h1>Access log</h1>
            <p className="sub">
                Last {rows.length} admin request{rows.length === 1 ? '' : 's'} — who touched farmer
                data, when, and what.
            </p>

            {rows.length === 0 ? (
                <p className="empty">Nothing here yet.</p>
            ) : (
                rows.map((r) => (
                    <div key={r.id} className="row">
                        <div className="grow">
                            <strong>{r.staffName}</strong>
                            <small>
                                {r.method} {r.route}
                                {r.subjectId ? ` · ${r.subjectType ?? 'subject'} ${r.subjectId}` : ''}
                                {r.ip ? ` · ${r.ip}` : ''}
                            </small>
                        </div>
                        <span className="pill" data-status={r.status < 400 ? 'ok' : 'error'}>
                            {r.status}
                        </span>
                        <small>{formatWhen(r.createdAt)}</small>
                    </div>
                ))
            )}
        </>
    );
}
