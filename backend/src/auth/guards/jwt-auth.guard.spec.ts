import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

// Mock the Supabase client
const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const map: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
    };
    return map[key] || '';
  }),
} as unknown as ConfigService;

function createMockExecutionContext(headers: Record<string, string> = {}): ExecutionContext {
  const mockRequest = { headers, user: null };
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(mockConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockExecutionContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
      const context = createMockExecutionContext({ authorization: 'Bearer invalid-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Supabase returns no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const context = createMockExecutionContext({ authorization: 'Bearer some-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should return true and attach user to request when token is valid', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const context = createMockExecutionContext({ authorization: 'Bearer valid-token' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockUser);
    });

    it('should strip Bearer prefix from token', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const context = createMockExecutionContext({ authorization: 'Bearer my-jwt-token' });
      await guard.canActivate(context);

      expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token');
    });

    it('should throw UnauthorizedException when Supabase throws', async () => {
      mockGetUser.mockRejectedValue(new Error('Network error'));
      const context = createMockExecutionContext({ authorization: 'Bearer some-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
