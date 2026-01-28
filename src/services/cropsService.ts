import database from '../database';
import { Q } from '@nozbe/watermelondb';
import Crop from '../database/models/Crop';

export interface CropData {
    id: string;
    pondId: string;
    status: 'active' | 'completed' | 'cancelled';
    name: string;
}

export const CropsService = {
    getAllCrops: async (pondId: string): Promise<CropData[]> => {
        const crops = await database.collections.get<Crop>('crops')
            .query(Q.where('pond_id', pondId))
            .fetch();

        return crops.map(c => ({
            id: c.id,
            pondId: c.pondId,
            status: c.status as any,
            name: c.name,
        }));
    },

    getActiveCrop: async (pondId: string): Promise<CropData | undefined> => {
        const crops = await database.collections.get<Crop>('crops')
            .query(
                Q.where('pond_id', pondId),
                Q.where('status', 'active')
            )
            .fetch();

        if (crops.length > 0) {
            const c = crops[0];
            return {
                id: c.id,
                pondId: c.pondId,
                status: c.status as any,
                name: c.name,
            };
        }
        return undefined;
    }
};
