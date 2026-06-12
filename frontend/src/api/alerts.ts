import apiClient from './client';

export interface AlertData {
    id: string;
    userId: string;
    farmId: string;
    pondId?: string;
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    data?: any;
    isRead: boolean;
    isPushSent: boolean;
    createdAt: string;
    updatedAt: string;
}

export const alertsApi = {
    findMine: (unreadOnly: boolean = false) =>
        apiClient.get<AlertData[]>('/alerts/me', { params: { unreadOnly } }),

    markAsRead: (id: string) =>
        apiClient.patch(`/alerts/${id}/read`),

    markAllAsRead: () =>
        apiClient.patch('/alerts/me/read-all'),

    remove: (id: string) =>
        apiClient.delete(`/alerts/${id}`),
};
