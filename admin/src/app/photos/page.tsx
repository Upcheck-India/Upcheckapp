import Link from 'next/link';
import { ApiError, FailedDeletion, listFailedDeletions } from '@/lib/ops';
import { runDrain } from './actions';

export const dynamic = 'force-dynamic';

export default async function PhotosPage({
    searchParams,
}: {
    searchParams: Promise<{ result?: string; error?: string; refused?: string }>;
}) {
    const { result, error, refused } = await searchParams;
    const parsed = result ? (JSON.parse(result) as { deleted: number; failed: number }) : null;

    let failures: FailedDeletion[];
    let listError: string | null = null;
    let listRefused = false;
    try {
        failures = await listFailedDeletions();
    } catch (err) {
        failures = [];
        listRefused = err instanceof ApiError && err.status === 401;
        listError = (err as Error).message;
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
            {parsed && (
                <p className="sub">Last drain: {parsed.deleted} deleted, {parsed.failed} still failing.</p>
            )}

            <h2>Failed deletions ({failures.length})</h2>
            {listError && (
                <p className="error">
                    {listRefused ? (
                        <>
                            Your admin key was refused — it may have been rotated or revoked.{' '}
                            <Link href="/login">Sign in again</Link>.
                        </>
                    ) : (
                        listError
                    )}
                </p>
            )}
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
