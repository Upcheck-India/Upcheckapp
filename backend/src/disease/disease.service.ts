import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseRecord } from './disease-record.entity';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';
import { UpdateDiseaseLibraryDto } from './dto/update-disease-library.dto';

const DISEASE_SEED_DATA: CreateDiseaseDto[] = [
    {
        name: 'AHPND/EMS',
        scientificName: 'Acute Hepatopancreatic Necrosis Disease',
        commonNames: ['EMS', 'Early Mortality Syndrome'],
        symptoms: ['Empty stomach', 'Pale hepatopancreas', 'Soft shells', 'Sluggish swimming'],
        preventionMeasures: ['Quarantine', 'Good water quality', 'Disinfection'],
        treatmentRecommendations: ['Probiotics', 'Water exchange', 'Lime application'],
        imageUrls: [],
        severityLevel: 'high',
    },
    {
        name: 'WSSV',
        scientificName: 'White Spot Syndrome Virus',
        commonNames: ['White Spot'],
        symptoms: ['White inclusions on carapace', 'Reduced feeding', 'Mortality'],
        preventionMeasures: ['Biosecurity', 'Screening'],
        treatmentRecommendations: ['No cure', 'Cull infected ponds'],
        imageUrls: [],
        severityLevel: 'high',
    },
    {
        name: 'EHP',
        scientificName: 'Enterocytozoon hepatopenaei',
        commonNames: ['EHP'],
        symptoms: ['Growth retardation', 'White feces syndrome', 'Reduced feed conversion'],
        preventionMeasures: ['Use SPF post-larvae', 'Biosecurity'],
        treatmentRecommendations: ['No effective treatment', 'Remove and disinfect'],
        imageUrls: [],
        severityLevel: 'medium',
    },
    {
        name: 'IMNV',
        scientificName: 'Infectious Myonecrosis Virus',
        commonNames: ['IMN'],
        symptoms: ['Muscle necrosis', 'White necrotic lesions', 'High mortality'],
        preventionMeasures: ['SPF stocks', 'Biosecurity'],
        treatmentRecommendations: ['No cure', 'Cull'],
        imageUrls: [],
        severityLevel: 'high',
    },
    {
        name: 'Vibriosis',
        scientificName: 'Vibrio spp.',
        commonNames: ['Luminescent Vibriosis', 'Shell disease'],
        symptoms: ['Luminescence', 'Necrotic lesions', 'Red discoloration'],
        preventionMeasures: ['Probiotics', 'Good water quality'],
        treatmentRecommendations: ['Antibiotics', 'Probiotics', 'Water exchange'],
        imageUrls: [],
        severityLevel: 'medium',
    },
    {
        name: 'Black Gill Disease',
        scientificName: 'Various fungi/bacteria',
        commonNames: ['Black gill'],
        symptoms: ['Black gill filaments', 'Reduced respiration'],
        preventionMeasures: ['Good water quality'],
        treatmentRecommendations: ['Water exchange', 'Lime'],
        imageUrls: [],
        severityLevel: 'low',
    },
    {
        name: 'Running Mortality Syndrome',
        scientificName: 'Running Mortality Syndrome',
        commonNames: ['RMS'],
        symptoms: ['Progressive mortality', 'Soft shells', 'Pale hepatopancreas'],
        preventionMeasures: ['Biosecurity', 'Quarantine'],
        treatmentRecommendations: ['Probiotics', 'Vitamins'],
        imageUrls: [],
        severityLevel: 'high',
    },
    {
        name: 'Shell Disease',
        scientificName: 'Shell Disease',
        commonNames: ['Brown spot'],
        symptoms: ['Brown/black spots on shell', 'Shell erosion'],
        preventionMeasures: ['Good water quality', 'Avoid injury'],
        treatmentRecommendations: ['Lime application', 'Improve water quality'],
        imageUrls: [],
        severityLevel: 'low',
    },
    {
        name: 'Taura Syndrome Virus',
        scientificName: 'Taura Syndrome Virus',
        commonNames: ['TSV'],
        symptoms: ['Cuticular epithelium lesions', 'Red tail'],
        preventionMeasures: ['SPF stocks', 'Biosecurity'],
        treatmentRecommendations: ['No cure', 'Cull'],
        imageUrls: [],
        severityLevel: 'high',
    },
    {
        name: 'Yellow Head Virus',
        scientificName: 'Yellow Head Virus',
        commonNames: ['YHV'],
        symptoms: ['Yellow head', 'Reduced feeding', 'Mortality'],
        preventionMeasures: ['SPF stocks', 'Screening'],
        treatmentRecommendations: ['No cure', 'Cull'],
        imageUrls: [],
        severityLevel: 'high',
    },
];

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

    async updateLibrary(id: string, dto: UpdateDiseaseLibraryDto): Promise<DiseaseLibrary> {
        const disease = await this.findDiseaseById(id);
        Object.assign(disease, dto);
        return this.diseaseLibraryRepository.save(disease);
    }

    async removeLibrary(id: string): Promise<void> {
        const disease = await this.findDiseaseById(id);
        await this.diseaseLibraryRepository.remove(disease);
    }

    async searchLibrary(query: string): Promise<DiseaseLibrary[]> {
        const q = `%${query}%`;
        return this.diseaseLibraryRepository
            .createQueryBuilder('d')
            .where('d.name ILIKE :q', { q })
            .orWhere('d.scientific_name ILIKE :q', { q })
            .orWhere("EXISTS (SELECT 1 FROM unnest(d.common_names) AS cn WHERE cn ILIKE :q)", { q })
            .orderBy('d.name', 'ASC')
            .getMany();
    }

    async seedDiseases(): Promise<{ seeded: boolean; count: number }> {
        const count = await this.diseaseLibraryRepository.count();
        if (count > 0) {
            return { seeded: false, count };
        }
        const entities = DISEASE_SEED_DATA.map((dto) => this.diseaseLibraryRepository.create(dto));
        await this.diseaseLibraryRepository.save(entities);
        return { seeded: true, count: DISEASE_SEED_DATA.length };
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
