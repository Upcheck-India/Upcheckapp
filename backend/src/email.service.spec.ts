import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: any) =>
              key === 'BREVO_API_KEY' ? 'test-key' : def,
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws when Brevo returns a 4xx (AUDIT id 111 — surface, do not swallow)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' }) as any;

    await expect(
      service.sendInviteEmail('friend@example.com', 'Alice'),
    ).rejects.toThrow('Brevo API error 400');
    expect(global.fetch).toHaveBeenCalledTimes(1); // no retry on 4xx
  });

  it('retries once on a 5xx then throws if it still fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, text: async () => 'down' }) as any;

    await expect(
      service.sendInviteEmail('friend@example.com', 'Alice'),
    ).rejects.toThrow('Brevo API error 503');
    expect(global.fetch).toHaveBeenCalledTimes(2); // one bounded retry
  });

  it('resolves without throwing on a 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;

    await expect(
      service.sendInviteEmail('friend@example.com', 'Alice'),
    ).resolves.toBeUndefined();
  });
});
