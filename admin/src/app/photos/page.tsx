import { ApiError, FailedDeletion, listFailedDeletions } from '@/lib/ops';
import { runDrain } from './actions';

export const dynamic = 'force-dynamic';

export default async function PhotosPage({
    searchParams,
}: {
    searchParams: Promise<{ result?: string; error?: string }>;
}) {
    const { result, error } = await searchParams;
    const parsed = result ? (JSON.parse(result) as { deleted: number; failed: number }) : null;

    let failures: FailedDeletion[];
    let listError: string | null = null;
    try {
        failures = await listFailedDeletions();
    } catch (err) {
        failures = [];
        listError = err instanceof ApiError ? err.message : (err as Error).message;
    }

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Photo deletion queue</h1>
                    <p className="sub">
                        Deletes queued R2 objects (record/pond/cycle/farm/account deletions, retention
                        sweeps). Rows that keep failing after repeated automatic retries sit below.
                    </p>
                </div>
                <div className="actions">
                    <form action={runDrain}>
                        <button type="submit">Drain now (includes failed rows)</button>
                    </form>
                </div>
            </div>

            {error && <p className="error">{error}</p>}
            {parsed && (
                <p className="sub">Last drain: {parsed.deleted} deleted, {parsed.failed} still failing.</p>
            )}

            <h2>Failed deletions ({failures.length})</h2>
            {listError && <p className="error">{listError}</p>}
            {failures.length === 0 && !listError ? (
                <p className="empty">Nothing stuck.</p>
            ) : (
                failures.map((f) => (
                    <div key={f.id} className="row" style={{ cursor: 'default' }}>
                        <div className="grow">
                            <strong>{f.namespace}/{f.path}</strong>
                            <small>
                                {f.reason} · {f.attempts} attempt(s)
                                {f.last_error && ` · ${f.last_error}`}
                            </small>
                        </div>
                    </div>
                ))
            )}
        </>
    );
}
