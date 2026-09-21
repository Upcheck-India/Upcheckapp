import { create } from 'zustand';

// Toast ids only need to be unique within the live toast list (no persistence,
// no crypto), so a monotonic counter avoids a uuid + crypto-polyfill dependency
// (react-native-get-random-values, which isn't installed and broke the bundle).
let toastCounter = 0;

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface UIState {
    isNetworkOnline: boolean;
    toasts: Toast[];
    /** Requests past SLOW_REQUEST_MS with no answer yet (see api/client.ts). */
    slowRequests: number;

    markSlowRequest: (delta: 1 | -1) => void;
    setNetworkOnline: (online: boolean) => void;
    showToast: (toast: Omit<Toast, 'id'>) => void;
    dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
    isNetworkOnline: true,
    toasts: [],
    slowRequests: 0,

    markSlowRequest: (delta) => set((state) => ({ slowRequests: Math.max(0, state.slowRequests + delta) })),
    setNetworkOnline: (isNetworkOnline) => set({ isNetworkOnline }),

    showToast: (toast) => {
        const id = `toast-${++toastCounter}`;
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        const duration = toast.duration ?? 3000;
        setTimeout(() => get().dismissToast(id), duration);
    },

    dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
