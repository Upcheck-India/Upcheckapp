import { Test, TestingModule } from '@nestjs/testing';
import { PondsController } from './ponds.controller';

describe('PondsController', () => {
  let controller: PondsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PondsController],
    }).compile();

    controller = module.get<PondsController>(PondsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
