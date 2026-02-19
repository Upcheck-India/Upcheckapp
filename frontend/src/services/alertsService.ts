import { apiClient } from './apiClient';

export interface Alert {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export const AlertsService = {
    async fetchAlerts(unreadOnly = false): Promise<Alert[]> {
        try {
            const result = await apiClient.get('/alerts/me' + (unreadOnly ? '?unreadOnly=true' : ''));
            return Array.isArray(result) ? result : [];
        } catch {
            return [];
        }
    },

    async markAsRead(id: string): Promise<void> {
        await apiClient.patch(`/alerts/${id}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await apiClient.patch('/alerts/me/read-all');
    },

    async getUnreadCount(): Promise<number> {
        try {
            const result = await apiClient.get('/alerts/me/count') as any;
            return typeof result === 'number' ? result : (result?.count ?? 0);
        } catch {
            return 0;
        }
    }
};
