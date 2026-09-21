'use server';

import { redirect } from 'next/navigation';
import { ingestNews } from '@/lib/ops';

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
        redirect(`/news?error=${encodeURIComponent((err as Error).message)}`);
    }
    redirect(`/news?result=${encodeURIComponent(JSON.stringify(result))}`);
}
