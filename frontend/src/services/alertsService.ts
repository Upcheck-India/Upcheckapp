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
        const response = await apiClient.get('/alerts' + (unreadOnly ? '?unread=true' : ''));
        return response.data;
    },

    async markAsRead(id: string): Promise<Alert> {
        const response = await apiClient.patch(`/alerts/${id}/read`);
        return response.data;
    },

    async markAllAsRead(): Promise<{ success: true }> {
        const response = await apiClient.post('/alerts/read-all');
        return response.data;
    },

    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get('/alerts/unread-count');
        return response.data;
    }
};
