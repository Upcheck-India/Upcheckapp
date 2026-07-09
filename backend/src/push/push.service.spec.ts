import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';
import { PushService } from './push.service';
import { User } from '../auth/user.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PushService.sendToUser — Expo HTTP-200 error body (AUDIT id 108)', () => {
  let service: PushService;
  let usersRepository: any;

  const USER_ID = 'user-1';

  beforeEach(async () => {
    usersRepository = {
      findOneBy: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[x]' }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get(PushService);
    jest.clearAllMocks();
  });

  it('clears the token and returns false on DeviceNotRegistered', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      },
    } as any);

    const result = await service.sendToUser(USER_ID, {
      title: 't',
      body: 'b',
    });

    expect(result).toBe(false);
    expect(usersRepository.update).toHaveBeenCalledWith(USER_ID, {
      pushToken: null,
    });
  });

  it('returns false without clearing the token on other Expo errors', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { data: [{ status: 'error', message: 'MessageTooBig' }] },
    } as any);

    const result = await service.sendToUser(USER_ID, {
      title: 't',
      body: 'b',
    });

    expect(result).toBe(false);
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('returns true on a normal 200 with an ok ticket', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { data: [{ status: 'ok', id: 'ticket-1' }] },
    } as any);

    const result = await service.sendToUser(USER_ID, {
      title: 't',
      body: 'b',
    });

    expect(result).toBe(true);
    expect(usersRepository.update).not.toHaveBeenCalled();
  });
});
