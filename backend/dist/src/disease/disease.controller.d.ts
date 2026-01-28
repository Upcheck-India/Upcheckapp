import { DiseaseService } from './disease.service';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';
export declare class DiseaseController {
    private readonly diseaseService;
    constructor(diseaseService: DiseaseService);
    createDisease(dto: CreateDiseaseDto): Promise<import("./disease-library.entity").DiseaseLibrary>;
    findAllDiseases(): Promise<import("./disease-library.entity").DiseaseLibrary[]>;
    findDiseaseById(id: string): Promise<import("./disease-library.entity").DiseaseLibrary>;
    recordOccurrence(dto: CreateDiseaseRecordDto): Promise<import("./disease-record.entity").DiseaseRecord>;
    findRecordsByCrop(cropId: string): Promise<import("./disease-record.entity").DiseaseRecord[]>;
}
