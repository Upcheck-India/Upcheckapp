'use server';

import { redirect } from 'next/navigation';
import { ApiError, ingestNews } from '@/lib/ops';

/**
 * Runs ingestion and hands the result back via the redirect's query string —
 * this page has no other server state to stash it in, and the result is
 * small (one row per source). Same trick as the photos drain action.
 */
export async function runIngest() {
    let result;
    try {
        result = await ingestNews();
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401 ? '&refused=1' : '';
        redirect(`/news?error=${encodeURIComponent((err as Error).message)}${refused}`);
    }
    redirect(`/news?result=${encodeURIComponent(JSON.stringify(result))}`);
}
