import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { UpdateMyProfileDto } from '../auth/dto/account.dto';

const createClientMock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));
import { SupabaseAuthService } from '../auth/supabase-auth.service';

describe('PATCH /profiles/me validation', () => {
  const check = async (body: unknown) => {
    const dto = plainToInstance(UpdateMyProfileDto, body);
    return { dto, errors: await validate(dto) };
  };

  it('trims and accepts 1–80 characters', async () => {
    const { dto, errors } = await check({ fullName: '  Aarav Sharma  ' });
    expect(errors).toHaveLength(0);
    expect(dto.fullName).toBe('Aarav Sharma');
  });

  it.each([[''], ['    '], ['x'.repeat(81)], [42], [undefined]])(
    'rejects %p',
    async (fullName) => {
      const { errors } = await check({ fullName });
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});

describe('ProfilesController me routes', () => {
  const profilesService = { upsert: jest.fn() };
  const accountService = {
    getAccountInfo: jest.fn(),
    updateName: jest.fn(async () => undefined),
  };
  const controller = new ProfilesController(
    profilesService as any,
    {} as any,
    accountService as any,
    { mine: jest.fn().mockResolvedValue({ avatarUrl: null, avatarThumbUrl: null, hasUploadedAvatar: false, showAvatarToTeam: true }) } as any,
  );
  const user = { id: 'u1', email: 'a@example.com' };

  beforeEach(() => {
    profilesService.upsert.mockResolvedValue({ id: 'u1', fullName: 'Aarav' });
    accountService.getAccountInfo.mockResolvedValue({
      createdAt: '2026-01-01T00:00:00.000Z',
      hasPassword: true,
      providers: ['email'],
      phone: null,
      phoneVerified: false,
      emailIsInternal: false,
    });
  });

  it('GET me merges the profile with account facts', async () => {
    await expect(controller.findMe(user)).resolves.toMatchObject({
      id: 'u1',
      fullName: 'Aarav',
      createdAt: '2026-01-01T00:00:00.000Z',
      hasPassword: true,
      providers: ['email'],
    });
  });

  it('PATCH me writes the name for the CALLER, then returns the fresh profile', async () => {
    const res = await controller.updateMe(user, { fullName: 'Aarav S' });
    expect(accountService.updateName).toHaveBeenCalledWith('u1', 'Aarav S');
    expect(res).toMatchObject({ id: 'u1' });
  });
});

describe('ProfilesService.upsert heals an empty name', () => {
  function build(existing: any, usersRow: any) {
    const repo = {
      findOneBy: jest.fn(async () => existing),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    const dataSource = { query: jest.fn(async () => (usersRow ? [usersRow] : [])) };
    const svc = new ProfilesService(repo as any, dataSource as any, {} as any, {} as any);
    return { svc, repo, dataSource };
  }

  it('fills an existing empty full_name from users.first/last_name', async () => {
    const { svc, repo } = build(
      { id: 'u1', email: 'a@example.com', fullName: '' },
      { first_name: 'Aarav', last_name: 'Sharma' },
    );
    const p = await svc.upsert('u1', 'a@example.com');
    expect(p.fullName).toBe('Aarav Sharma');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Aarav Sharma' }));
  });

  it('creates a new profile with the users name', async () => {
    const { svc, repo } = build(null, { first_name: 'Aarav', last_name: null });
    await svc.upsert('u1', 'a@example.com');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Aarav' }));
  });

  it('does not query users when the profile already has a name', async () => {
    const { svc, dataSource } = build({ id: 'u1', email: 'a', fullName: 'Kept' }, null);
    await svc.upsert('u1', 'a');
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

describe('signup writes the name in every spelling readers use', () => {
  it('adds full_name / first_name / last_name next to firstName / lastName', async () => {
    const signUp = jest.fn(async () => ({ data: { user: null, session: null }, error: null }));
    createClientMock.mockReturnValue({ auth: { signUp } });
    const svc = new SupabaseAuthService(
      new ConfigService({
        SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_ROLE_KEY: 'service',
        FRONTEND_URL: 'app://',
      }),
    );
    await svc.signUp('a@example.com', 'Abcdef1#', {
      firstName: ' Aarav ',
      lastName: 'Sharma',
      language: 'ta',
    });
    expect((signUp.mock.calls[0] as any)[0].options.data).toEqual({
      firstName: ' Aarav ',
      lastName: 'Sharma',
      language: 'ta',
      full_name: 'Aarav Sharma',
      first_name: 'Aarav',
      last_name: 'Sharma',
    });
  });
});
