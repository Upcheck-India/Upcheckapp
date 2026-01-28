import { Pond } from '../ponds/pond.entity';
export declare class WaterQualityRecord {
    id: string;
    pondId: string;
    pond: Pond;
    recordedAt: Date;
    ph: number;
    temperature: number;
    dissolvedOxygen: number;
    salinity: number;
    ammonia: number;
    nitrite: number;
    nitrate: number;
    alkalinity: number;
    hardness: number;
    transparency: number;
    notes: string;
}
