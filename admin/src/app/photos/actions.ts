'use server';

import { redirect } from 'next/navigation';
import { ApiError, drainPhotoDeletions } from '@/lib/ops';

export async function runDrain() {
    let result;
    try {
        result = await drainPhotoDeletions();
    } catch (err) {
        const refused = err instanceof ApiError && err.status === 401 ? '&refused=1' : '';
        redirect(`/photos?error=${encodeURIComponent((err as Error).message)}${refused}`);
    }
    redirect(`/photos?result=${encodeURIComponent(JSON.stringify(result))}`);
}
