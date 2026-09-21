'use server';

import { redirect } from 'next/navigation';
import { drainPhotoDeletions } from '@/lib/ops';

export async function runDrain() {
    let result;
    try {
        result = await drainPhotoDeletions();
    } catch (err) {
        redirect(`/photos?error=${encodeURIComponent((err as Error).message)}`);
    }
    redirect(`/photos?result=${encodeURIComponent(JSON.stringify(result))}`);
}
