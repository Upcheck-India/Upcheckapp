import { Farm } from '../farms/farm.entity';
export declare class Pond {
    id: string;
    farmId: string;
    farm: Farm;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    namePrefix: string;
    autoNumber: number;
    pondCode: string;
    type: string;
    lengthM: number;
    widthM: number;
    areaM2: number;
    depthM: number;
    rfidTag: string;
    speciesType: string;
    stockingDate: Date;
    status: string;
}
