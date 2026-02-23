import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';

describe('CropsController', () => {
  let controller: CropsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CropsController],
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        { provide: CropsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: 'EmailService', useValue: {} },
        { provide: 'PondsService', useValue: {} },
        { provide: 'InventoryService', useValue: {} }
      ],
    }).compile();

    controller = module.get<CropsController>(CropsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
