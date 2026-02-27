import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProfilesService } from './profiles.service';
import { Profile } from './profile.entity';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        ProfilesService,
        {
          provide: getRepositoryToken(Profile),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    mockRepository = module.get<Repository<Profile>>(getRepositoryToken(Profile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const createDto = {
        username: 'johndoe',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        website: 'https://johndoe.com',
        languagePreference: 'en'
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [{ id: '1', username: 'johndoe' }];
      mockRepository.find.mockResolvedValue(mockProfiles);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockProfiles);
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const profileId = 'user-1';
      const mockProfile = { id: profileId, username: 'johndoe', fullName: 'John Doe' };
      mockRepository.findOneBy.mockResolvedValue(mockProfile);

      const result = await service.findOne(profileId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: profileId });
      expect(result).toEqual(mockProfile);
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const profileId = 'user-1';
      const updateDto = { fullName: 'Jane Doe' };
      const updatedProfile = { id: profileId, username: 'johndoe', fullName: 'Jane Doe' };

      mockRepository.findOneBy.mockResolvedValue(updatedProfile);

      const result = await service.update(profileId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(profileId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: profileId });
      expect(result).toEqual(updatedProfile);
    });
  });
});
