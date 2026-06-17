import apiClient from './client';

export type TrayResidue = 'empty' | 'few_left' | 'a_lot_left';

export interface CreateFeedingTrayCheck {
  cropId: string;
  checkDate: string; // YYYY-MM-DD
  checkTime: string; // HH:mm
  trayNumber: number;
  remainingFeedStatus: TrayResidue;
  feedRecordId?: string;
}

export interface FeedingTrayCheck {
  id: string;
  cropId: string;
  checkDate: string;
  checkTime: string;
  trayNumber: number;
  remainingFeedStatus: TrayResidue;
  createdAt?: string;
}

export const feedingTrayApi = {
  create: (body: CreateFeedingTrayCheck) =>
    apiClient.post<FeedingTrayCheck>('/feeding-tray-checks', body),

  getByCrop: (cropId: string) =>
    apiClient.get<FeedingTrayCheck[]>('/feeding-tray-checks', { params: { cropId } }),

  remove: (id: string) => apiClient.delete(`/feeding-tray-checks/${id}`),
};
