'use server';

import { revalidatePath } from 'next/cache';
import { createPriceFeed } from '@/lib/ops';

export async function saveFeed(formData: FormData) {
    const region = String(formData.get('region') ?? '').trim();
    const date = String(formData.get('date') ?? '');
    const source = String(formData.get('source') ?? '') || undefined;
    const pricesRaw = String(formData.get('prices') ?? '{}');

    let prices: Record<string, number>;
    try {
        prices = JSON.parse(pricesRaw);
    } catch {
        throw new Error('Prices must be valid JSON, e.g. {"30": 520, "40": 430}');
    }

    await createPriceFeed({ region, date, prices, source });
    revalidatePath('/prices');
}
