import Link from 'next/link';
import { ApiError, searchFarms } from '@/lib/directory';

export const dynamic = 'force-dynamic';

export default async function FarmsPage({
    searchParams,
}: {
    searchParams: Promise<{ name?: string }>;
}) {
    const { name } = await searchParams;
    const query = name?.trim() ?? '';

    let results: Awaited<ReturnType<typeof searchFarms>> = [];
    let error: string | null = null;
    let refused = false;
    if (query) {
        try {
            results = await searchFarms(query);
        } catch (err) {
            refused = err instanceof ApiError && err.status === 401;
            error = (err as Error).message;
        }
    }

    return (
        <>
            <h1>Farms</h1>
            <p className="sub">Search by farm name — at least 3 characters, prefix match.</p>

            <form className="editor" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="name">Farm name</label>
                    <input id="name" name="name" type="text" defaultValue={name ?? ''} minLength={3} />
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

            {query && query.length < 3 && <p className="empty">Type at least 3 characters.</p>}
            {query && query.length >= 3 && !error && results.length === 0 && <p className="empty">No match.</p>}

            {results.map((f) => (
                <Link key={f.id} href={`/farms/${f.id}`} className="row">
                    <div className="grow">
                        <strong>{f.name}</strong>
                        <small>{f.farmCode ?? f.id}</small>
                    </div>
                </Link>
            ))}
        </>
    );
}
