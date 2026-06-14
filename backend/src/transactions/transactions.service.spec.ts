import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';
import { FarmsService } from '../farms/farms.service';

const USER_ID = 'user-1';

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
  let mockFarmsService: { verifyOwnership: jest.Mock; findAll: jest.Mock; findOwnedByUser: jest.Mock };

  beforeEach(async () => {
    mockFarmsService = {
      // Resolves => caller owns the farm. Tests override to simulate denial.
      verifyOwnership: jest.fn().mockResolvedValue({ id: 'farm-1', userId: USER_ID }),
      findAll: jest.fn().mockResolvedValue([{ id: 'farm-1' }]),
      findOwnedByUser: jest.fn().mockResolvedValue([{ id: 'farm-1' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: createMockRepository() },
        { provide: FarmsService, useValue: mockFarmsService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    mockRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new transaction after verifying farm ownership', async () => {
      const createDto = {
        farmId: 'farm-1',
        transactionDate: new Date().toISOString(),
        type: 'income',
        category: 'harvest_sale',
        amount: 1000,
        description: 'Test transaction',
      };

      const result = await service.create(createDto as any, USER_ID);

      expect(mockFarmsService.verifyOwnership).toHaveBeenCalledWith('farm-1', USER_ID);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return transactions across the caller-owned farms', async () => {
      const mockTransactions = [{ id: '1', amount: 100 }];
      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.findAll(USER_ID);

      // Economics must scope to OWNED farms only, never member farms.
      expect(mockFarmsService.findOwnedByUser).toHaveBeenCalledWith(USER_ID);
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockTransactions);
    });

    it('should filter by farmId after verifying ownership', async () => {
      const farmId = 'farm-1';
      await service.findAll(USER_ID, farmId);

      expect(mockFarmsService.verifyOwnership).toHaveBeenCalledWith(farmId, USER_ID);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { farmId },
        order: { transactionDate: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an owned transaction by id', async () => {
      const transactionId = 'trans-1';
      const mockTransaction = { id: transactionId, amount: 100, farmId: 'farm-1' };
      mockRepository.findOneBy.mockResolvedValue(mockTransaction);

      const result = await service.findOne(transactionId, USER_ID);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: transactionId });
      expect(mockFarmsService.verifyOwnership).toHaveBeenCalledWith('farm-1', USER_ID);
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('update', () => {
    it('should update an owned transaction', async () => {
      const transactionId = 'trans-1';
      const updateDto = { amount: 200 };
      const updatedTransaction = { id: transactionId, amount: 200, farmId: 'farm-1' };

      mockRepository.findOneBy.mockResolvedValue(updatedTransaction);

      const result = await service.update(transactionId, updateDto as any, USER_ID);

      expect(mockRepository.update).toHaveBeenCalledWith(transactionId, updateDto);
      expect(result).toEqual(updatedTransaction);
    });
  });

  describe('remove', () => {
    it('should remove an owned transaction', async () => {
      const transactionId = 'trans-1';
      mockRepository.findOneBy.mockResolvedValue({ id: transactionId, farmId: 'farm-1' });

      const result = await service.remove(transactionId, USER_ID);

      expect(mockRepository.delete).toHaveBeenCalledWith(transactionId);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('getSummaryByFarm', () => {
    it('should return transaction summary for an owned farm', async () => {
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

      const result = await service.getSummaryByFarm(farmId, USER_ID);

      expect(mockFarmsService.verifyOwnership).toHaveBeenCalledWith(farmId, USER_ID);
      expect(result).toEqual({
        totalIncome: 1500,
        totalExpense: 800,
        netProfit: 700,
      });
    });
  });
});
