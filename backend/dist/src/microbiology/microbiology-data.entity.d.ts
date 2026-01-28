import { Crop } from '../crops/crop.entity';
export declare class MicrobiologyData {
    id: string;
    cropId: string;
    crop: Crop;
    measurementDate: Date;
    totalBacillusCfuMl: number;
    totalVibrioCountTvcCfuMl: number;
    yellowVibrioCountTvcCfuMl: number;
    greenVibrioCountTvcCfuMl: number;
    luminescentBacteriaLbCfuMl: number;
    note: string;
    createdAt: Date;
}
