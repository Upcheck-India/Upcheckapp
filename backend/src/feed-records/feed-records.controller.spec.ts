import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeedRecordsController } from './feed-records.controller';
import { FeedRecordsService } from './feed-records.service';

describe('FeedRecordsController', () => {
  let controller: FeedRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedRecordsController],
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        { provide: FeedRecordsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: 'EmailService', useValue: {} },
        { provide: 'PondsService', useValue: {} },
        { provide: 'InventoryService', useValue: {} }
      ],
    }).compile();

    controller = module.get<FeedRecordsController>(FeedRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
