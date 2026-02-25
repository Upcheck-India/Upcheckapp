import { create } from 'zustand';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface UIState {
    isNetworkOnline: boolean;
    toasts: Toast[];

    setNetworkOnline: (online: boolean) => void;
    showToast: (toast: Omit<Toast, 'id'>) => void;
    dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
    isNetworkOnline: true,
    toasts: [],

    setNetworkOnline: (isNetworkOnline) => set({ isNetworkOnline }),

    showToast: (toast) => {
        const id = uuidv4();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        const duration = toast.duration ?? 3000;
        setTimeout(() => get().dismissToast(id), duration);
    },

    dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
