import { Test, TestingModule } from '@nestjs/testing';
import { ShrimpCalculationsService } from './shrimp-calculations.service';

describe('ShrimpCalculationsService', () => {
  let service: ShrimpCalculationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShrimpCalculationsService],
    }).compile();

    service = module.get<ShrimpCalculationsService>(ShrimpCalculationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
