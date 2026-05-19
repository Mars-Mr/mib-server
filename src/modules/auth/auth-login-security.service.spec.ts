import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import { AuthLoginSecurityService } from './auth-login-security.service';
import { RedisBusinessService } from '../../infrastructure/redis/redis-business.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('AuthLoginSecurityService', () => {
  let service: AuthLoginSecurityService;
  const redis = {
    ttl: jest.fn<() => Promise<number>>(),
    incr: jest.fn<() => Promise<number>>(),
    set: jest.fn<() => Promise<'OK'>>(),
    del: jest.fn<() => Promise<number>>(),
  };
  const redisBiz = {
    checkRateLimit: jest.fn<() => Promise<{ allowed: boolean; current: number; ttl: number; limit: number }>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthLoginSecurityService,
        {
          provide: ENV_CONFIG,
          useValue: {
            AUTH_LOGIN_MAX_ATTEMPTS: 5,
            AUTH_LOGIN_WINDOW_SECONDS: 900,
            AUTH_LOGIN_LOCK_AFTER_FAILURES: 3,
            AUTH_LOGIN_LOCK_SECONDS: 600,
          },
        },
        { provide: RedisService, useValue: redis },
        { provide: RedisBusinessService, useValue: redisBiz },
      ],
    }).compile();
    service = module.get(AuthLoginSecurityService);
  });

  it('rejects when account is locked', async () => {
    redis.ttl.mockResolvedValue(120);
    await expect(service.assertCanAttemptLogin('1.2.3.4', 'alice')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('locks account after enough strikes', async () => {
    redis.incr.mockResolvedValue(3);
    const result = await service.recordLoginFailure('1.2.3.4', 'alice');
    expect(result.locked).toBe(true);
    expect(redis.set).toHaveBeenCalled();
  });
});
