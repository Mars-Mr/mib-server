import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonLoggersService } from '../../common/logger/winston-loggers.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisBusinessService } from '../../infrastructure/redis/redis-business.service';
import { AuthLoginSecurityService } from './auth-login-security.service';
import { AuthService } from './auth.service';

const client = { ip: '127.0.0.1', userAgent: 'jest', deviceHint: 'desktop' };

describe('AuthService login security', () => {
  let service: AuthService;
  const loginSecurity = {
    assertCanAttemptLogin: jest.fn<() => Promise<void>>(),
    recordLoginFailure: jest.fn<() => Promise<{ locked: boolean; lockSeconds: number }>>(),
    clearLoginFailures: jest.fn<() => Promise<void>>(),
  };
  const prisma = {
    tenant: {
      findUnique: jest.fn<() => Promise<unknown>>(),
    },
    user: {
      findFirst: jest.fn<() => Promise<unknown>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
    },
    loginEvent: {
      create: jest.fn<() => Promise<unknown>>(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    loginSecurity.recordLoginFailure.mockResolvedValue({ locked: false, lockSeconds: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
        { provide: PrismaService, useValue: prisma },
        { provide: AuthLoginSecurityService, useValue: loginSecurity },
        { provide: RedisBusinessService, useValue: { blacklistToken: jest.fn() } },
        {
          provide: WinstonLoggersService,
          useValue: { logSecurity: jest.fn(), logAudit: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('uses generic message when user not found', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't1', code: 'default' });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ username: 'nope', password: 'x' }, client)).rejects.toThrow(
      '用户名或密码错误',
    );
    expect(loginSecurity.recordLoginFailure).toHaveBeenCalledWith(client.ip, 'nope');
    expect(prisma.loginEvent.create).toHaveBeenCalled();
  });

  it('increments tokenVersion on password change', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('oldpass', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'alice',
      role: 'STAFF',
      passwordHash: hash,
      tokenVersion: 2,
    });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      username: 'alice',
      role: 'STAFF',
      tokenVersion: 3,
    });

    await service.changePassword('u1', { currentPassword: 'oldpass', newPassword: 'newpass12' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      }),
    );
  });
});
