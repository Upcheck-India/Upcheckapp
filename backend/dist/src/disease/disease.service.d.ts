import { Repository } from 'typeorm';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseRecord } from './disease-record.entity';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';
export declare class DiseaseService {
    private diseaseLibraryRepository;
    private diseaseRecordRepository;
    constructor(diseaseLibraryRepository: Repository<DiseaseLibrary>, diseaseRecordRepository: Repository<DiseaseRecord>);
    createDisease(dto: CreateDiseaseDto): Promise<DiseaseLibrary>;
    findAllDiseases(): Promise<DiseaseLibrary[]>;
    findDiseaseById(id: string): Promise<DiseaseLibrary>;
    recordOccurrence(dto: CreateDiseaseRecordDto): Promise<DiseaseRecord>;
    findRecordsByCrop(cropId: string): Promise<DiseaseRecord[]>;
}
