import { Crop } from '../crops/crop.entity';
export declare class ChemicalData {
    id: string;
    cropId: string;
    crop: Crop;
    measurementDate: Date;
    measurementTime: string;
    ammoniaNh3Ppm: number;
    nitriteNo2Ppm: number;
    alkalinityPpm: number;
    nitrateNo3Ppm: number;
    hardnessPpm: number;
    calciumCaPpm: number;
    magnesiumMgPpm: number;
    carbonateCo3Ppm: number;
    bicarbonateHco3Ppm: number;
    tomPpm: number;
    ammoniumNh4Ppm: number;
    phosphatePo4Ppm: number;
    totalAmmoniaPpm: number;
    potassiumPpm: number;
    createdAt: Date;
}
