import Link from 'next/link';
import { getFarm } from '@/lib/directory';
import { formatWhen } from '@/lib/feedback';

export const dynamic = 'force-dynamic';

export default async function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let farm;
    try {
        farm = await getFarm(id);
    } catch (err) {
        return (
            <>
                <p><Link href="/farms">← Farms</Link></p>
                <p className="error">Could not load this farm. {(err as Error).message}</p>
            </>
        );
    }

    return (
        <>
            <p><Link href="/farms">← Farms</Link></p>

            <h1>{farm.name}</h1>
            <p className="sub">{farm.farmCode ?? farm.id} · created {formatWhen(farm.createdAt)}</p>

            <h2>Owner</h2>
            {farm.owner ? (
                <Link href={`/users/${farm.owner.id}`} className="row">
                    <div className="grow">
                        <strong>{[farm.owner.firstName, farm.owner.lastName].filter(Boolean).join(' ') || farm.owner.email}</strong>
                        <small>{farm.owner.email}</small>
                    </div>
                </Link>
            ) : (
                <p className="empty">Owner account not found.</p>
            )}

            <h2>Members ({farm.members.length})</h2>
            {farm.members.length === 0 ? (
                <p className="empty">No members.</p>
            ) : (
                farm.members.map((m) => (
                    <Link key={m.id} href={`/users/${m.id}`} className="row">
                        <div className="grow">
                            <strong>{[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email}</strong>
                            <small>{m.role} · {m.status}</small>
                        </div>
                    </Link>
                ))
            )}

            <h2>Ponds ({farm.ponds.length})</h2>
            {farm.ponds.length === 0 ? (
                <p className="empty">No ponds.</p>
            ) : (
                farm.ponds.map((p) => (
                    <div key={p.id} className="row" style={{ cursor: 'default' }}>
                        <div className="grow">
                            <strong>{p.name}</strong>
                        </div>
                        <span className="pill">{p.status}</span>
                    </div>
                ))
            )}

            <h2>Recent cycles ({farm.cycles.length})</h2>
            {farm.cycles.length === 0 ? (
                <p className="empty">No cycles.</p>
            ) : (
                farm.cycles.map((c) => (
                    <div key={c.id} className="row" style={{ cursor: 'default' }}>
                        <div className="grow">
                            <strong>{c.name}</strong>
                            <small>{formatWhen(c.createdAt)}</small>
                        </div>
                        <span className="pill">{c.status}</span>
                    </div>
                ))
            )}

            <h2>Activity</h2>
            <p className="sub">
                {farm.recentActivity.measurementsLast30d === null
                    ? 'Not available (not migrated yet).'
                    : `${farm.recentActivity.measurementsLast30d} log(s) in the last 30 days.`}
            </p>
        </>
    );
}
