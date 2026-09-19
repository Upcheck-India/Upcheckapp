import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { treatmentsApi, type Ingredient } from '../api/treatments';
import type { BannedSubstance } from './bannedSubstances';

/**
 * The treatment ingredient catalogue (disease spec D2), fetched from
 * `GET /treatments/ingredients` and persisted so the picker works OFFLINE.
 * Same shape as the banned-list store. Before the first successful fetch the
 * list is empty and the form still saves through its free-text row.
 */
interface IngredientsState {
    ingredients: Ingredient[];
    version: string | null;
    hydrate: () => Promise<void>;
}

export const useIngredientsStore = create<IngredientsState>()(
    persist(
        (set) => ({
            ingredients: [],
            version: null,
            hydrate: async () => {
                try {
                    const { data } = await treatmentsApi.ingredients();
                    if (data?.ingredients?.length) set({ ingredients: data.ingredients, version: data.version });
                } catch {
                    // Offline / older backend — keep the cached list.
                }
            },
        }),
        {
            name: 'treatment-ingredients',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (s) => ({ ingredients: s.ingredients, version: s.version }),
        },
    ),
);

type Lang = keyof Ingredient['names'];

/** The ingredient's name in the app language, English when missing. */
export const ingredientName = (i: Ingredient, lang: string): string =>
    i.names[(lang as Lang)] || i.names.en;

/**
 * Search every name and alias in all six locales ("పొటాషియం" and "KCl" both
 * find KCl). A typed query searches every category; an empty one lists the
 * chosen category.
 */
export const searchIngredients = (list: Ingredient[], query: string, category?: string | null): Ingredient[] => {
    const q = query.trim().toLowerCase();
    if (!q) return category ? list.filter((i) => i.category === category) : list;
    return list.filter((i) => [...Object.values(i.names), ...i.aliases].some((n) => n.toLowerCase().includes(q)));
};

/**
 * Banned-list entries behind the picked ingredients (exact, via `bannedKey`).
 * `bannedKey` is the list entry's name as a slug until D1 gives entries a key.
 */
export const bannedFromIngredients = (keys: string[], list: Ingredient[], banned: BannedSubstance[]): BannedSubstance[] => {
    const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const wanted = new Set(keys.map((k) => list.find((i) => i.key === k)?.bannedKey).filter(Boolean));
    return banned.filter((b) => wanted.has(slug(b.name)));
};
