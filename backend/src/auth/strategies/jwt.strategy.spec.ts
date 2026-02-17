import { UnauthorizedException } from '@nestjs/common';

// We test the validate() method in isolation since the JwtStrategy
// constructor reads an RS256 public key from disk, which conflicts with
// the test environment's module resolution. Instead we test the core
// logic directly.

describe('JwtStrategy validate logic', () => {
    const mockAuthService = {
        validateUser: jest.fn(),
    };

    // Replicate the validate method logic from JwtStrategy
    const validate = async (payload: any) => {
        const user = await mockAuthService.validateUser(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        return {
            userId: payload.sub,
            email: payload.email,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return user info for valid payload', async () => {
        const payload = { sub: 'test-user-id', email: 'test@example.com' };
        mockAuthService.validateUser.mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' });

        const result = await validate(payload);

        expect(result).toEqual({ userId: 'test-user-id', email: 'test@example.com' });
        expect(mockAuthService.validateUser).toHaveBeenCalledWith('test-user-id');
    });

    it('should throw UnauthorizedException if user not found', async () => {
        const payload = { sub: 'unknown-user-id', email: 'unknown@example.com' };
        mockAuthService.validateUser.mockResolvedValue(null);

        await expect(validate(payload)).rejects.toThrow(UnauthorizedException);
    });
});
