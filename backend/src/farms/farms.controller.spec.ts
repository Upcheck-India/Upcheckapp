import { DataSource } from 'typeorm';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';

describe('FarmsController', () => {
  let controller: FarmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FarmsController],
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        { provide: FarmsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: FarmAccessService, useValue: { getRoleOnFarm: jest.fn().mockResolvedValue('owner'), assertCanAccessFarm: jest.fn(), assertCanAccessPond: jest.fn(), getAccessibleFarmIds: jest.fn().mockResolvedValue([]) } },
        { provide: 'EmailService', useValue: {} },
        { provide: 'PondsService', useValue: {} },
        { provide: 'InventoryService', useValue: {} }
      ],
    }).compile();

    controller = module.get<FarmsController>(FarmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
