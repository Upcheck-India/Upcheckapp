'use server';

import { revalidatePath } from 'next/cache';
import { resetQuotaLimit, setQuotaLimit } from '@/lib/storage-quota';

/**
 * Admin photo-quota management (item 2). A Server Action, so the staffer's
 * admin key stays on the server (same reasoning as reports/[id]/actions.ts)
 * — `req.adminStaff`, not anything from this form, is what the backend
 * records as `set_by`.
 */
export async function saveLimit(userId: string, formData: FormData) {
    const maxPhotos = Number(formData.get('maxPhotos'));
    const maxBytesGb = Number(formData.get('maxBytesGb'));
    const reason = String(formData.get('reason') ?? '').trim();

    await setQuotaLimit(userId, {
        maxPhotos,
        maxBytes: Math.round(maxBytesGb * 1024 ** 3),
        reason,
    });

    revalidatePath(`/users/${userId}`);
    revalidatePath('/storage');
}

export async function clearLimit(userId: string, formData: FormData) {
    const reason = String(formData.get('resetReason') ?? '').trim();
    await resetQuotaLimit(userId, reason);

    revalidatePath(`/users/${userId}`);
    revalidatePath('/storage');
}
