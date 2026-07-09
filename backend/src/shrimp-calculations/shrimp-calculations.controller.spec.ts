import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ShrimpCalculationsController } from './shrimp-calculations.controller';
import { ShrimpCalculationsService } from './shrimp-calculations.service';

describe('ShrimpCalculationsController', () => {
  let controller: ShrimpCalculationsController;
  let calculationsService: any;

  beforeEach(async () => {
    calculationsService = {
      calculateBiomass: jest.fn().mockReturnValue(42),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShrimpCalculationsController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://dummy.com') },
        },
        { provide: ShrimpCalculationsService, useValue: calculationsService },
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

  describe('calculateBiomass (AUDIT id 33 — reject NaN, not garbage-in)', () => {
    it('rejects a missing stockCount', () => {
      expect(() =>
        controller.calculateBiomass(undefined as any, '10'),
      ).toThrow(BadRequestException);
    });

    it('rejects a non-numeric averageWeightG', () => {
      expect(() => controller.calculateBiomass('100', 'abc')).toThrow(
        BadRequestException,
      );
    });

    it('passes valid numeric query params through', () => {
      expect(controller.calculateBiomass('100', '15')).toEqual({
        biomassKg: 42,
      });
      expect(calculationsService.calculateBiomass).toHaveBeenCalledWith(
        100,
        15,
      );
    });
  });
});
