import { create } from 'zustand';

export type NotificationLevel = 'info' | 'warning' | 'critical';

export interface AppNotification {
    id: string;
    cycleId?: string;
    pondName?: string;
    type: string;
    level: NotificationLevel;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    navigateTo?: string;
    navigateParams?: Record<string, string>;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    unreadCriticalCount: number;

    setNotifications: (notifications: AppNotification[]) => void;
    addNotification: (notification: AppNotification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    unreadCriticalCount: 0,

    setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        const unreadCriticalCount = notifications.filter(
            (n) => !n.isRead && n.level === 'critical'
        ).length;
        set({ notifications, unreadCount, unreadCriticalCount });
    },

    addNotification: (notification) => {
        const { notifications } = get();
        const updated = [notification, ...notifications];
        get().setNotifications(updated);
    },

    markAsRead: (id) => {
        const updated = get().notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
        );
        get().setNotifications(updated);
    },

    markAllAsRead: () => {
        const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
        set({ notifications: updated, unreadCount: 0, unreadCriticalCount: 0 });
    },

    removeNotification: (id) => {
        const updated = get().notifications.filter((n) => n.id !== id);
        get().setNotifications(updated);
    },

    clearAll: () =>
        set({ notifications: [], unreadCount: 0, unreadCriticalCount: 0 }),
}));
