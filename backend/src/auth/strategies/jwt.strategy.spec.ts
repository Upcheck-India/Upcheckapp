
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { UnauthorizedException } from '@nestjs/common';

const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return null;
    }),
};

const mockUserRepository = {
    findOneBy: jest.fn(),
};

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should validate and return the user based on payload', async () => {
            const payload = { sub: 'test-user-id' };
            const user = { id: 'test-user-id', email: 'test@example.com' };
            mockUserRepository.findOneBy.mockResolvedValue(user);

            const result = await strategy.validate(payload);
            expect(result).toEqual(user);
            expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'test-user-id' });
        });

        it('should throw UnauthorizedException if user is not found', async () => {
            const payload = { sub: 'unknown-user-id' };
            mockUserRepository.findOneBy.mockResolvedValue(null);

            await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        });
    });
});
