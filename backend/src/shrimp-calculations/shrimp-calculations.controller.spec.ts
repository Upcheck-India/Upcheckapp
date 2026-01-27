import { Test, TestingModule } from '@nestjs/testing';
import { ShrimpCalculationsController } from './shrimp-calculations.controller';

describe('ShrimpCalculationsController', () => {
  let controller: ShrimpCalculationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShrimpCalculationsController],
    }).compile();

    controller = module.get<ShrimpCalculationsController>(ShrimpCalculationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
