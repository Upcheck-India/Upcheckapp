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

export const feedingTrayApi = {
  create: (body: CreateFeedingTrayCheck) =>
    apiClient.post('/feeding-tray-checks', body),
};
