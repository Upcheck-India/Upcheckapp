import Link from 'next/link';
import { ApiError, listAnnouncements, CATEGORY_LABEL, formatWhen } from '@/lib/announcements';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
    let announcements;
    try {
        announcements = await listAnnouncements();
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401;
        return (
            <>
                <h1>Announcements</h1>
                <p className="error">
                    {refused ? (
                        <>
                            Your admin key was refused — it may have been rotated or revoked.{' '}
                            <Link href="/login">Sign in again</Link>.
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

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Announcements</h1>
                    <p className="sub">
                        {announcements.length} card{announcements.length === 1 ? '' : 's'} — what
                        farmers see on app open.
                    </p>
                </div>
                <Link href="/announcements/new" className="button">
                    + New announcement
                </Link>
            </div>

            {announcements.length === 0 ? (
                <p className="empty">Nothing here yet.</p>
            ) : (
                announcements.map((a) => (
                    <Link key={a.id} href={`/announcements/${a.id}`} className="row">
                        <div className="grow">
                            <strong>{a.title}</strong>
                            <small>
                                {a.key} · {CATEGORY_LABEL[a.category] ?? a.category} · priority{' '}
                                {a.priority}
                                {a.publishedAt && ` · last published ${formatWhen(a.publishedAt)}`}
                            </small>
                        </div>
                        <span className="pill" data-published={a.isPublished}>
                            {a.isPublished ? 'Published' : 'Draft'}
                        </span>
                    </Link>
                ))
            )}
        </>
    );
}
