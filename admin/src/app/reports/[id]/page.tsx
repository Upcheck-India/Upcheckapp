import Link from 'next/link';
import {
    getReport,
    listNotes,
    formatWhen,
    STATUSES,
    STATUS_LABEL,
    CATEGORY_LABEL,
    headline,
} from '@/lib/feedback';
import { saveReport, saveNote } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let report;
    try {
        report = await getReport(id);
    } catch (err) {
        return (
            <>
                <p>
                    <Link href="/reports">← Inbox</Link>
                </p>
                <p className="error">Could not load this report. {(err as Error).message}</p>
            </>
        );
    }

    // Best-effort: an inbox that fails to render because the internal notes
    // table isn't migrated yet is worse than one with a quietly empty list.
    const notes = await listNotes(id).catch(() => []);

    // The actions are bound here, on the server, so the id is not something
    // the browser can change on submit.
    const save = saveReport.bind(null, report.id);
    const addNote = saveNote.bind(null, report.id);

    return (
        <>
            <p>
                <Link href="/reports">← Inbox</Link>
            </p>

            <h1>{headline(report)}</h1>
            <p className="sub">
                {CATEGORY_LABEL[report.category] ?? report.category} · {formatWhen(report.createdAt)}{' '}
                · <span className="pill" data-status={report.status}>{STATUS_LABEL[report.status]}</span>
            </p>

            <h2>What the farmer wrote</h2>
            <div className="message">{report.message}</div>
            <p className="sub">
                <small>
                    user {report.userId}
                    {report.farmId ? ` · farm ${report.farmId}` : ''}
                </small>
            </p>

            {report.attachmentPaths.length > 0 && (
                <>
                    <h2>Photos ({report.attachmentPaths.length})</h2>
                    {report.attachmentUrls.length === 0 ? (
                        <p className="empty">
                            The images could not be signed right now — reload in a moment.
                        </p>
                    ) : (
                        <div className="photos">
                            {/*
                              P5: never a bare <img> (or a direct link) to an
                              attachment on the admin's own origin. Pre-fix
                              uploads may still carry a stored object whose
                              content-type was echoed from an untrusted
                              client — opening or rendering that directly
                              risks the browser treating it as navigable
                              HTML. A fully sandboxed iframe (no scripts, no
                              same-origin, no top navigation) can only ever
                              display pixels or an inert download, never
                              execute anything, whatever the object turns
                              out to actually be.
                            */}
                            {report.attachmentUrls.map((url, i) => (
                                <iframe
                                    key={url}
                                    src={url}
                                    title={`Attachment ${i + 1}`}
                                    sandbox=""
                                    referrerPolicy="no-referrer"
                                    className="attachment-frame"
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <h2>Reply to the farmer</h2>
            <form action={save} className="editor">
                <div>
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status" defaultValue={report.status}>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="adminResponse">
                        Response — the farmer reads this in the app. Editing it replaces what they
                        see; clearing it removes the reply.
                    </label>
                    <textarea
                        id="adminResponse"
                        name="adminResponse"
                        defaultValue={report.adminResponse ?? ''}
                        placeholder="We found the problem — a fix goes out this week. Thank you for telling us."
                        maxLength={4000}
                    />
                </div>

                <div>
                    <label htmlFor="respondedBy">Your name (shown to the farmer)</label>
                    <input
                        id="respondedBy"
                        name="respondedBy"
                        type="text"
                        defaultValue={report.respondedBy ?? ''}
                        maxLength={120}
                    />
                </div>

                <div>
                    <label htmlFor="assignee">Assigned to (internal — free text)</label>
                    <input
                        id="assignee"
                        name="assignee"
                        type="text"
                        defaultValue={report.assignee ?? ''}
                        maxLength={120}
                        placeholder="Unassigned"
                    />
                </div>

                <button type="submit">Save</button>
            </form>

            {report.respondedAt && (
                <p className="sub">
                    <small>
                        Last replied {formatWhen(report.respondedAt)}
                        {report.respondedBy ? ` by ${report.respondedBy}` : ''}
                    </small>
                </p>
            )}

            <h2>Internal notes ({notes.length})</h2>
            <p className="sub">
                <small>Staff only — the farmer never sees these. Append-only: nothing here can be edited or removed.</small>
            </p>
            {notes.length === 0 ? (
                <p className="empty">No notes yet.</p>
            ) : (
                notes.map((n) => (
                    <div key={n.id} className="message" style={{ marginBottom: 8 }}>
                        <div>{n.note}</div>
                        <small className="sub">
                            {formatWhen(n.createdAt)}{n.author ? ` · ${n.author}` : ''}
                        </small>
                    </div>
                ))
            )}
            <form action={addNote} className="editor">
                <div>
                    <label htmlFor="note">Add a note</label>
                    <textarea id="note" name="note" maxLength={2000} placeholder="What did you find out / do?" />
                </div>
                <div>
                    <label htmlFor="author">Your name</label>
                    <input id="author" name="author" type="text" maxLength={120} />
                </div>
                <button type="submit" className="secondary">Add note</button>
            </form>
        </>
    );
}
