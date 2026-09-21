import Link from 'next/link';
import { ApiError, listPriceFeeds } from '@/lib/ops';
import { saveFeed } from './actions';

export const dynamic = 'force-dynamic';

export default async function PricesPage({
    searchParams,
}: {
    searchParams: Promise<{ region?: string }>;
}) {
    const { region } = await searchParams;

    let feeds: Awaited<ReturnType<typeof listPriceFeeds>> = [];
    let error: string | null = null;
    let refused = false;
    if (region) {
        try {
            feeds = await listPriceFeeds(region);
        } catch (err) {
            refused = err instanceof ApiError && err.status === 401;
            error = (err as Error).message;
        }
    }

    return (
        <>
            <h1>Price feeds</h1>
            <p className="sub">Count-based ₹/kg bands by region — feeds Harvest Timing and P&amp;L.</p>

            <form className="editor" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="region">Region</label>
                    <input id="region" name="region" type="text" defaultValue={region ?? ''} placeholder="AP-Nellore" />
                </div>
                <button type="submit" className="secondary">Search</button>
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
            {region && !error && feeds.length === 0 && <p className="empty">No feeds for this region.</p>}

            {feeds.map((f) => (
                <div key={f.id} className="row" style={{ cursor: 'default' }}>
                    <div className="grow">
                        <strong>{f.region} · {f.date}</strong>
                        <small>
                            {Object.entries(f.prices).map(([count, price]) => `${count}ct ₹${price}`).join(', ')}
                            {' · '}{f.source}
                        </small>
                    </div>
                </div>
            ))}

            <h2>Add a feed</h2>
            <form action={saveFeed} className="editor">
                <div>
                    <label htmlFor="new-region">Region</label>
                    <input id="new-region" name="region" type="text" required defaultValue={region ?? ''} />
                </div>
                <div>
                    <label htmlFor="date">Date</label>
                    <input id="date" name="date" type="date" required />
                </div>
                <div>
                    <label htmlFor="prices">Prices (count band → ₹/kg, JSON)</label>
                    <textarea id="prices" name="prices" required placeholder='{"30": 520, "40": 430, "50": 360}' />
                </div>
                <div>
                    <label htmlFor="source">Source</label>
                    <select id="source" name="source" defaultValue="self">
                        <option value="self">Self</option>
                        <option value="processor">Processor</option>
                        <option value="local_agent">Local agent</option>
                    </select>
                </div>
                <button type="submit">Save feed</button>
            </form>
        </>
    );
}
