'use server';

import { revalidatePath } from 'next/cache';
import { addNote, updateReport } from '@/lib/feedback';

/**
 * Save the status, the response and the assignee together.
 *
 * One action, one form: a staffer who writes a reply and forgets to press a
 * second "change status" button is the most likely way this tool goes wrong,
 * so the two live on the same submit. (The backend also refuses to leave a
 * replied-to report at `new` — see FeedbackService.update.)
 *
 * A Server Action, so the staffer's admin key stays on the server. It's read
 * from `@/lib/feedback`, which is `server-only`.
 */
export async function saveReport(id: string, formData: FormData) {
    const status = String(formData.get('status') ?? '');
    const adminResponse = String(formData.get('adminResponse') ?? '');
    const respondedBy = String(formData.get('respondedBy') ?? '');
    const assignee = String(formData.get('assignee') ?? '');

    await updateReport(id, { status, adminResponse, respondedBy, assignee });

    // Both the detail page and the inbox show this report's status.
    revalidatePath(`/reports/${id}`);
    revalidatePath('/reports');
}

/** Append-only — there is no edit or delete action for a note on purpose. */
export async function saveNote(id: string, formData: FormData) {
    const note = String(formData.get('note') ?? '').trim();
    if (!note) return; // nothing typed — don't add a blank note
    const author = String(formData.get('author') ?? '').trim();

    await addNote(id, { note, author: author || undefined });

    revalidatePath(`/reports/${id}`);
}
