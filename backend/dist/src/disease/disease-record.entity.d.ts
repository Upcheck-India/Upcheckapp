import { Crop } from '../crops/crop.entity';
import { DiseaseLibrary } from './disease-library.entity';
export declare class DiseaseRecord {
    id: string;
    cropId: string;
    crop: Crop;
    diseaseId: string;
    disease: DiseaseLibrary;
    recordedDate: Date;
    severityAtDetection: string;
    photoUrls: string[];
    notes: string;
    createdAt: Date;
}
