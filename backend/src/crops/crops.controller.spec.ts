import { Test, TestingModule } from '@nestjs/testing';
import { CropsController } from './crops.controller';

describe('CropsController', () => {
  let controller: CropsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CropsController],
    }).compile();

    controller = module.get<CropsController>(CropsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
