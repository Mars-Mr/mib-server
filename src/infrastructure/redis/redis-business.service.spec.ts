import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessLockBusyError, LockOperationTimeoutError, RedisBusinessService } from './redis-business.service';
import { RedisService } from './redis.service';

describe('RedisBusinessService locks', () => {
  let service: RedisBusinessService;
  const redis = {
    acquireLock: jest.fn<() => Promise<string | null>>(),
    renewLock: jest.fn<() => Promise<boolean>>(),
    releaseLock: jest.fn<() => Promise<boolean>>(),
    get: jest.fn<() => Promise<unknown>>(),
    set: jest.fn<() => Promise<'OK'>>(),
    setNx: jest.fn<() => Promise<boolean>>(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    getOrSet: jest.fn(),
    rateLimit: jest.fn(),
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new RedisBusinessService(redis as unknown as RedisService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runWithBusinessLock releases lock after success', async () => {
    redis.acquireLock.mockResolvedValue('token-a');
    redis.releaseLock.mockResolvedValue(true);
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue('ok');

    const result = await service.runWithBusinessLock('resource-1', 10, fn);

    expect(result).toBe('ok');
    expect(redis.acquireLock).toHaveBeenCalledWith('biz:resource-1', 10);
    expect(redis.releaseLock).toHaveBeenCalledWith('biz:resource-1', 'token-a');
  });

  it('runWithBusinessLock throws BusinessLockBusyError when not acquired', async () => {
    redis.acquireLock.mockResolvedValue(null);

    await expect(
      service.runWithBusinessLock('busy', 10, async () => 'x'),
    ).rejects.toBeInstanceOf(BusinessLockBusyError);
    expect(redis.releaseLock).not.toHaveBeenCalled();
  });

  it('runWithBusinessLock times out and still releases lock', async () => {
    redis.acquireLock.mockResolvedValue('token-a');
    redis.releaseLock.mockResolvedValue(true);

    const pending = service.runWithBusinessLock(
      'slow',
      10,
      () => new Promise<string>(() => {}),
      { operationTimeoutMs: 1000 },
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(LockOperationTimeoutError);

    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(redis.releaseLock).toHaveBeenCalledWith('biz:slow', 'token-a');
  });

  it('request idempotency replays completed response', async () => {
    redis.setNx.mockResolvedValueOnce(false);
    redis.get.mockResolvedValueOnce({
      phase: 'completed',
      statusCode: 201,
      body: { id: 'order-1' },
      completedAt: Date.now(),
    });

    const begin = await service.beginRequestIdempotency('order:create:key-1', 60);
    expect(begin).toEqual({ action: 'replay', statusCode: 201, body: { id: 'order-1' } });
  });

  it('request idempotency proceed on first SET NX', async () => {
    redis.setNx.mockResolvedValue(true);
    const begin = await service.beginRequestIdempotency('order:create:key-2', 60);
    expect(begin).toEqual({ action: 'proceed' });
  });

  it('runWithBusinessLocks acquires in sorted order and renews', async () => {
    redis.acquireLock.mockResolvedValueOnce('t1').mockResolvedValueOnce('t2');
    redis.releaseLock.mockResolvedValue(true);
    redis.renewLock.mockResolvedValue(true);

    let done!: () => void;
    const fn = () =>
      new Promise<number>(resolve => {
        done = () => resolve(1);
      });
    const run = service.runWithBusinessLocks(['z-res', 'a-res'], 10, fn, {
      operationTimeoutMs: 5000,
      renewIntervalMs: 2000,
    });

    await jest.advanceTimersByTimeAsync(2000);
    expect(redis.renewLock).toHaveBeenCalled();
    done();
    const result = await run;

    expect(result).toBe(1);
    expect(redis.acquireLock).toHaveBeenNthCalledWith(1, 'biz:a-res', 10);
    expect(redis.acquireLock).toHaveBeenNthCalledWith(2, 'biz:z-res', 10);
  });
});
