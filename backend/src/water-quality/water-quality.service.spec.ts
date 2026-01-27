import { Test, TestingModule } from '@nestjs/testing';
import { WaterQualityService } from './water-quality.service';

describe('WaterQualityService', () => {
  let service: WaterQualityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaterQualityService],
    }).compile();

    service = module.get<WaterQualityService>(WaterQualityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
