import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsService } from './alerts.service';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';

describe('AlertsService', () => {
  let service: AlertsService;
  let repository: MockRepository<Alert>;
  
  const mockAlert = new Alert();
  mockAlert.id = 'alert-1';
  mockAlert.userId = 'user-1';
  mockAlert.type = 'water_quality';
  mockAlert.title = 'Water Quality Alert';
  mockAlert.message = 'pH level is outside normal range';
  mockAlert.severity = 'warning';
  mockAlert.isRead = false;
  mockAlert.pondId = 'pond-1';
  mockAlert.farmId = 'farm-1';
  mockAlert.createdAt = new Date();
  
  const mockCreateAlertDto: CreateAlertDto = {
    userId: 'user-1',
    type: 'water_quality',
    title: 'New Alert',
    message: 'Alert message',
    severity: 'info',
    pondId: 'pond-1',
    farmId: 'farm-1',
  };
  
  type MockRepository<T = any> = Partial<Record<string, jest.Mock>>;
  
  const createMockRepository = (): MockRepository<Alert> => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    repository = module.get(getRepositoryToken(Alert));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('create', () => {
    it('should create a new alert', async () => {
      (repository.create as jest.Mock).mockReturnValue(mockAlert);
      (repository.save as jest.Mock).mockResolvedValue(mockAlert);
      
      const result = await service.create(mockCreateAlertDto);
      
      expect(repository.create).toHaveBeenCalledWith(mockCreateAlertDto);
      expect(repository.save).toHaveBeenCalledWith(mockAlert);
      expect(result).toEqual(mockAlert);
    });
  });
  
  describe('findByUser', () => {
    it('should return alerts for a user', async () => {
      const userId = 'user-1';
      const alerts = [mockAlert];
      
      (repository.find as jest.Mock).mockResolvedValue(alerts);
      
      const result = await service.findByUser(userId);
      
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(alerts);
    });
    
    it('should return unread alerts when unreadOnly is true', async () => {
      const userId = 'user-1';
      const alerts = [mockAlert];
      
      (repository.find as jest.Mock).mockResolvedValue(alerts);
      
      const result = await service.findByUser(userId, true);
      
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(alerts);
    });
  });
  
  describe('findOne', () => {
    it('should return an alert by id', async () => {
      const alertId = 'alert-1';
      
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockAlert);
      
      const result = await service.findOne(alertId);
      
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: alertId });
      expect(result).toEqual(mockAlert);
    });
  });
  
  describe('markAsRead', () => {
    it('should mark an alert as read', async () => {
      const alertId = 'alert-1';
      
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      (repository.findOneBy as jest.Mock).mockResolvedValue({ ...mockAlert, isRead: true });
      
      const result = await service.markAsRead(alertId);
      
      expect(repository.update).toHaveBeenCalledWith(alertId, { isRead: true });
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: alertId });
      expect(result!.isRead).toBe(true);
    });
  });
  
  describe('markAllAsRead', () => {
    it('should mark all alerts as read for a user', async () => {
      const userId = 'user-1';
      
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      
      const result = await service.markAllAsRead(userId);
      
      expect(repository.update).toHaveBeenCalledWith(
        { userId, isRead: false }, 
        { isRead: true }
      );
      expect(result).toEqual({ success: true });
    });
  });
  
  describe('remove', () => {
    it('should remove an alert', async () => {
      const alertId = 'alert-1';
      
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      
      const result = await service.remove(alertId);
      
      expect(repository.delete).toHaveBeenCalledWith(alertId);
      expect(result).toEqual({ affected: 1 });
    });
  });
  
  describe('getUnreadCount', () => {
    it('should return unread alert count for a user', async () => {
      const userId = 'user-1';
      const count = 3;
      
      (repository.count as jest.Mock).mockResolvedValue(count);
      
      const result = await service.getUnreadCount(userId);
      
      expect(repository.count).toHaveBeenCalledWith({ where: { userId, isRead: false } });
      expect(result).toBe(count);
    });
  });
});