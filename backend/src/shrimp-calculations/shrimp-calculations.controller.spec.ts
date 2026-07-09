import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShrimpCalculationsController } from './shrimp-calculations.controller';
import { ShrimpCalculationsService } from './shrimp-calculations.service';

describe('ShrimpCalculationsController', () => {
  let controller: ShrimpCalculationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShrimpCalculationsController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://dummy.com') },
        },
        { provide: ShrimpCalculationsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: 'EmailService', useValue: {} },
        { provide: 'PondsService', useValue: {} },
        { provide: 'InventoryService', useValue: {} },
      ],
    }).compile();

    controller = module.get<ShrimpCalculationsController>(
      ShrimpCalculationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
