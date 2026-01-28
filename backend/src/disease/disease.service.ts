import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseRecord } from './disease-record.entity';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';

@Injectable()
export class DiseaseService {
    constructor(
        @InjectRepository(DiseaseLibrary)
        private diseaseLibraryRepository: Repository<DiseaseLibrary>,
        @InjectRepository(DiseaseRecord)
        private diseaseRecordRepository: Repository<DiseaseRecord>,
    ) { }

    // --- Library Methods ---

    async createDisease(dto: CreateDiseaseDto): Promise<DiseaseLibrary> {
        const disease = this.diseaseLibraryRepository.create(dto);
        return this.diseaseLibraryRepository.save(disease);
    }

    async findAllDiseases(): Promise<DiseaseLibrary[]> {
        return this.diseaseLibraryRepository.find({
            order: { name: 'ASC' },
        });
    }

    async findDiseaseById(id: string): Promise<DiseaseLibrary> {
        const disease = await this.diseaseLibraryRepository.findOne({ where: { id } });
        if (!disease) throw new NotFoundException('Disease not found');
        return disease;
    }

    // --- Record Methods ---

    async recordOccurrence(dto: CreateDiseaseRecordDto): Promise<DiseaseRecord> {
        const record = this.diseaseRecordRepository.create(dto);
        return this.diseaseRecordRepository.save(record);
    }

    async findRecordsByCrop(cropId: string): Promise<DiseaseRecord[]> {
        return this.diseaseRecordRepository.find({
            where: { cropId },
            relations: ['disease'],
            order: { recordedDate: 'DESC' },
        });
    }
}
