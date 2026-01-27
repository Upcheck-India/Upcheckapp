import { Test, TestingModule } from '@nestjs/testing';
import { FeedRecordsController } from './feed-records.controller';

describe('FeedRecordsController', () => {
  let controller: FeedRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedRecordsController],
    }).compile();

    controller = module.get<FeedRecordsController>(FeedRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
