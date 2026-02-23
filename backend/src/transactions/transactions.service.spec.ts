import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: 100 }),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    mockRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const createDto = {
        farmId: 'farm-1',
        transactionDate: new Date().toISOString(),
        type: 'income',
        category: 'harvest_sale',
        amount: 1000,
        description: 'Test transaction'
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      const mockTransactions = [{ id: '1', amount: 100 }];
      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockTransactions);
    });

    it('should filter by farmId', async () => {
      const farmId = 'farm-1';
      await service.findAll(farmId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { farmId },
        order: { transactionDate: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      const transactionId = 'trans-1';
      const mockTransaction = { id: transactionId, amount: 100 };
      mockRepository.findOneBy.mockResolvedValue(mockTransaction);

      const result = await service.findOne(transactionId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: transactionId });
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const transactionId = 'trans-1';
      const updateDto = { amount: 200 };
      const updatedTransaction = { id: transactionId, amount: 200 };
      
      mockRepository.findOneBy.mockResolvedValue(updatedTransaction);

      const result = await service.update(transactionId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(transactionId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: transactionId });
      expect(result).toEqual(updatedTransaction);
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      const transactionId = 'trans-1';
      const result = await service.remove(transactionId);

      expect(mockRepository.delete).toHaveBeenCalledWith(transactionId);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('getSummaryByFarm', () => {
    it('should return transaction summary for a farm', async () => {
      const farmId = 'farm-1';
      const mockIncome = { total: '1500' };
      const mockExpense = { total: '800' };
      
      mockRepository.createQueryBuilder
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue(mockIncome),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue(mockExpense),
        });

      const result = await service.getSummaryByFarm(farmId);

      expect(result).toEqual({
        totalIncome: "1500",
        totalExpense: "800",
        netProfit: 700,
      });
    });
  });
});
