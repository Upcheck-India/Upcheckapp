import { Test, TestingModule } from '@nestjs/testing';
import { FeedRecordsService } from './feed-records.service';

describe('FeedRecordsService', () => {
  let service: FeedRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedRecordsService],
    }).compile();

    service = module.get<FeedRecordsService>(FeedRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
