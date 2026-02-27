import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    const reflector = new Reflector();
    guard = new JwtAuthGuard(reflector, { get: jest.fn().mockReturnValue('http://dummy.com') } as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
