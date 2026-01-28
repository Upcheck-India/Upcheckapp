export declare class CreateDiseaseDto {
    name: string;
    scientificName?: string;
    commonNames?: string[];
    symptoms?: string[];
    preventionMeasures?: string[];
    treatmentRecommendations?: string[];
    imageUrls?: string[];
    severityLevel?: string;
}
export declare class CreateDiseaseRecordDto {
    cropId: string;
    diseaseId: string;
    recordedDate: string;
    severityAtDetection?: string;
    photoUrls?: string[];
    notes?: string;
}
