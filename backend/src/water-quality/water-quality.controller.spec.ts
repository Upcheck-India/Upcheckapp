import { Test, TestingModule } from '@nestjs/testing';
import { WaterQualityController } from './water-quality.controller';

describe('WaterQualityController', () => {
  let controller: WaterQualityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaterQualityController],
    }).compile();

    controller = module.get<WaterQualityController>(WaterQualityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
