import { Crop } from '../crops/crop.entity';
export declare class SamplingData {
    id: string;
    cropId: string;
    crop: Crop;
    samplingDate: Date;
    mbwG: number;
    totalSamples: number;
    stdDeviation: number;
    biomassEstimationKg: number;
    srEstimationPercent: number;
    notes: string;
    photoUrls: string[];
    createdAt: Date;
}
