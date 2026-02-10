import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiseaseService } from './disease.service';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseRecord } from './disease-record.entity';
import { CreateDiseaseDto, CreateDiseaseRecordDto } from './dto/create-disease.dto';
import { NotFoundException } from '@nestjs/common';

describe('DiseaseService', () => {
  let service: DiseaseService;
  let diseaseLibraryRepository: MockRepository<DiseaseLibrary>;
  let diseaseRecordRepository: MockRepository<DiseaseRecord>;
  
  const mockDisease = new DiseaseLibrary();
  mockDisease.id = 'disease-1';
  mockDisease.name = 'White Spot Syndrome';
  mockDisease.scientificName = 'WSSV';
  mockDisease.commonNames = ['White spot', 'White tail'];
  mockDisease.symptoms = ['White spots on carapace', 'Reduced feeding'];
  mockDisease.preventionMeasures = ['Biosecurity', 'Water quality management'];
  mockDisease.treatmentRecommendations = ['Improve water quality', 'Salt bath'];
  mockDisease.imageUrls = [];
  mockDisease.severityLevel = 'high';
  mockDisease.createdAt = new Date();
  
  const mockDiseaseRecord = new DiseaseRecord();
  mockDiseaseRecord.id = 'record-1';
  mockDiseaseRecord.cropId = 'crop-1';
  mockDiseaseRecord.diseaseId = 'disease-1';
  mockDiseaseRecord.recordedDate = new Date();
  mockDiseaseRecord.severityAtDetection = 'medium';
  mockDiseaseRecord.photoUrls = [];
  mockDiseaseRecord.notes = 'First detection';
  mockDiseaseRecord.createdAt = new Date();
  
  const mockCreateDiseaseDto: CreateDiseaseDto = {
    name: 'New Disease',
    scientificName: 'Scientific Name',
    commonNames: ['Common name 1', 'Common name 2'],
    symptoms: ['Symptom 1', 'Symptom 2'],
    preventionMeasures: ['Prevention 1', 'Prevention 2'],
    treatmentRecommendations: ['Treatment 1', 'Treatment 2'],
    imageUrls: ['url1', 'url2'],
    severityLevel: 'medium',
  };
  
  const mockCreateDiseaseRecordDto: CreateDiseaseRecordDto = {
    cropId: 'crop-1',
    diseaseId: 'disease-1',
    recordedDate: new Date().toISOString(),
    severityAtDetection: 'high',
    photoUrls: ['photo1.jpg', 'photo2.jpg'],
    notes: 'Severe outbreak',
  };
  
  type MockRepository<T = any> = Partial<Record<string, jest.Mock>>;
  
  const createMockRepository = (): MockRepository<any> => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiseaseService,
        {
          provide: getRepositoryToken(DiseaseLibrary),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DiseaseRecord),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DiseaseService>(DiseaseService);
    diseaseLibraryRepository = module.get(getRepositoryToken(DiseaseLibrary));
    diseaseRecordRepository = module.get(getRepositoryToken(DiseaseRecord));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('createDisease', () => {
    it('should create a new disease in library', async () => {
      (diseaseLibraryRepository.create as jest.Mock).mockReturnValue(mockDisease);
      (diseaseLibraryRepository.save as jest.Mock).mockResolvedValue(mockDisease);
      
      const result = await service.createDisease(mockCreateDiseaseDto);
      
      expect(diseaseLibraryRepository.create).toHaveBeenCalledWith(mockCreateDiseaseDto);
      expect(diseaseLibraryRepository.save).toHaveBeenCalledWith(mockDisease);
      expect(result).toEqual(mockDisease);
    });
  });
  
  describe('findAllDiseases', () => {
    it('should return all diseases ordered by name', async () => {
      const diseases = [mockDisease];
      
      (diseaseLibraryRepository.find as jest.Mock).mockResolvedValue(diseases);
      
      const result = await service.findAllDiseases();
      
      expect(diseaseLibraryRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toEqual(diseases);
    });
  });
  
  describe('findDiseaseById', () => {
    it('should return a disease by id', async () => {
      const diseaseId = 'disease-1';
      
      (diseaseLibraryRepository.findOne as jest.Mock).mockResolvedValue(mockDisease);
      
      const result = await service.findDiseaseById(diseaseId);
      
      expect(diseaseLibraryRepository.findOne).toHaveBeenCalledWith({ where: { id: diseaseId } });
      expect(result).toEqual(mockDisease);
    });
    
    it('should throw NotFoundException when disease not found', async () => {
      const diseaseId = 'non-existent';
      
      (diseaseLibraryRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      await expect(service.findDiseaseById(diseaseId)).rejects.toThrow(NotFoundException);
    });
  });
  
  describe('recordOccurrence', () => {
    it('should record a disease occurrence', async () => {
      (diseaseRecordRepository.create as jest.Mock).mockReturnValue(mockDiseaseRecord);
      (diseaseRecordRepository.save as jest.Mock).mockResolvedValue(mockDiseaseRecord);
      
      const result = await service.recordOccurrence(mockCreateDiseaseRecordDto);
      
      expect(diseaseRecordRepository.create).toHaveBeenCalledWith(mockCreateDiseaseRecordDto);
      expect(diseaseRecordRepository.save).toHaveBeenCalledWith(mockDiseaseRecord);
      expect(result).toEqual(mockDiseaseRecord);
    });
  });
  
  describe('findRecordsByCrop', () => {
    it('should return disease records for a crop ordered by date', async () => {
      const cropId = 'crop-1';
      const records = [mockDiseaseRecord];
      
      (diseaseRecordRepository.find as jest.Mock).mockResolvedValue(records);
      
      const result = await service.findRecordsByCrop(cropId);
      
      expect(diseaseRecordRepository.find).toHaveBeenCalledWith({
        where: { cropId },
        relations: ['disease'],
        order: { recordedDate: 'DESC' },
      });
      expect(result).toEqual(records);
    });
  });
});