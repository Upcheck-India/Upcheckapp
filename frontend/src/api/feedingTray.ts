import apiClient from './client';

export type TrayResidue = 'empty' | 'few_left' | 'a_lot_left';

export interface CreateFeedingTrayCheck {
  cropId: string;
  checkDate: string; // YYYY-MM-DD
  checkTime: string; // HH:mm
  trayNumber: number;
  remainingFeedStatus: TrayResidue;
  feedRecordId?: string;
  /** F5: tray photos (cap 2). Current clients send this. */
  photoPaths?: string[];
  /** Older single-photo form, still accepted. */
  photoPath?: string | null;
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
