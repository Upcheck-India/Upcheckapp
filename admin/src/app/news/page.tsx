import { runIngest } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewsPage({
    searchParams,
}: {
    searchParams: Promise<{ result?: string; error?: string }>;
}) {
    const { result, error } = await searchParams;
    const parsed = result ? (JSON.parse(result) as { sources: { source: string; fetched: number; inserted: number; skipped: number; error?: string }[] }) : null;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>News ingest</h1>
                    <p className="sub">
                        Runs the same job as the hourly cron — for kicking it manually after a
                        Render free-instance sleep, or checking a new source right away.
                    </p>
                </div>
                <div className="actions">
                    <form action={runIngest}>
                        <button type="submit">Run ingest now</button>
                    </form>
                </div>
            </div>

            {error && <p className="error">{error}</p>}

            {parsed && (
                <>
                    <h2>Last run</h2>
                    {parsed.sources.map((s) => (
                        <div key={s.source} className="row" style={{ cursor: 'default' }}>
                            <div className="grow">
                                <strong>{s.source}</strong>
                                <small>
                                    fetched {s.fetched} · inserted {s.inserted} · skipped {s.skipped}
                                    {s.error && ` · error: ${s.error}`}
                                </small>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </>
    );
}
