import { Injectable } from '@nestjs/common';
import type {
  BeginRequestIdempotencyResult,
  IdempotencyStoredRecord,
} from '../../common/idempotency/idempotency.types';
import { sleep } from '../../common/idempotency/request-idempotency.util';
import { BusinessLockBusyError, LockOperationTimeoutError } from './redis-lock.errors';
import type { RunWithBusinessLockOptions } from './redis-lock.types';
import { RedisService } from './redis.service';

export type {
  BeginRequestIdempotencyResult,
  IdempotencyStoredRecord,
} from '../../common/idempotency/idempotency.types';

export { BusinessLockBusyError, LockOperationTimeoutError } from './redis-lock.errors';
export type { RunWithBusinessLockOptions } from './redis-lock.types';

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  ttl: number;
}

export interface IdempotencyResult<T> {
  repeated: boolean;
  value: T | null;
}

@Injectable()
export class RedisBusinessService {
  constructor(private readonly redis: RedisService) {}

  async getCache<T>(namespace: string, id: string): Promise<T | null> {
    return this.redis.get<T>(this.cacheKey(namespace, id));
  }

  async setCache(namespace: string, id: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.cacheKey(namespace, id), value, ttlSeconds);
  }

  async deleteCache(namespace: string, id: string): Promise<number> {
    return this.redis.del(this.cacheKey(namespace, id));
  }

  async remember<T>(namespace: string, id: string, ttlSeconds: number, factory: () => Promise<T> | T): Promise<T> {
    return this.redis.getOrSet(this.cacheKey(namespace, id), ttlSeconds, factory);
  }

  async saveLoginSession(userId: number | string, tokenId: string, payload: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.loginSessionKey(userId, tokenId), payload, ttlSeconds);
  }

  async getLoginSession<T>(userId: number | string, tokenId: string): Promise<T | null> {
    return this.redis.get<T>(this.loginSessionKey(userId, tokenId));
  }

  async removeLoginSession(userId: number | string, tokenId: string): Promise<number> {
    return this.redis.del(this.loginSessionKey(userId, tokenId));
  }

  async blacklistToken(tokenId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.tokenBlacklistKey(tokenId), 1, ttlSeconds);
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    return this.redis.exists(this.tokenBlacklistKey(tokenId));
  }

  async setVerificationCode(scene: string, target: string, code: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.verificationCodeKey(scene, target), code, ttlSeconds);
  }

  async consumeVerificationCode(scene: string, target: string, code: string): Promise<boolean> {
    const key = this.verificationCodeKey(scene, target);
    const cached = await this.redis.get<string>(key);
    if (cached !== code) return false;
    await this.redis.del(key);
    return true;
  }

  async checkRateLimit(scope: string, subject: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const result = await this.redis.rateLimit(`${scope}:${subject}`, limit, windowSeconds);
    return { ...result, limit };
  }

  async markIdempotency<T>(businessKey: string, ttlSeconds: number, value?: T): Promise<IdempotencyResult<T>> {
    const key = this.idempotencyKey(businessKey);
    const stored = value === undefined ? 'PENDING' : value;
    const created = await this.redis.setNx(key, stored, ttlSeconds);
    if (created) {
      return { repeated: false, value: null };
    }
    return { repeated: true, value: await this.redis.get<T>(key) };
  }

  async completeIdempotency<T>(businessKey: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.idempotencyKey(businessKey), value, ttlSeconds);
  }

  /**
   * HTTP request idempotency: SET NX processing, then cache successful response.
   * DB unique constraints remain the source of truth; this replays the first HTTP result.
   */
  async beginRequestIdempotency(
    scopeKey: string,
    processingTtlSeconds: number,
  ): Promise<BeginRequestIdempotencyResult> {
    const key = this.idempotencyKey(scopeKey);
    const processing: IdempotencyStoredRecord = { phase: 'processing', startedAt: Date.now() };
    const created = await this.redis.setNx(key, processing, processingTtlSeconds);
    if (created) return { action: 'proceed' };

    const existing = await this.redis.get<IdempotencyStoredRecord>(key);
    if (!existing) {
      const retry = await this.redis.setNx(key, processing, processingTtlSeconds);
      return retry ? { action: 'proceed' } : { action: 'in_progress' };
    }
    if (existing.phase === 'completed') {
      return {
        action: 'replay',
        statusCode: existing.statusCode,
        body: existing.body,
      };
    }
    return { action: 'in_progress' };
  }

  async waitForRequestIdempotencyCompletion(
    scopeKey: string,
    maxWaitMs: number,
    pollIntervalMs: number,
  ): Promise<{ statusCode: number; body: unknown } | null> {
    const key = this.idempotencyKey(scopeKey);
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      await sleep(pollIntervalMs);
      const existing = await this.redis.get<IdempotencyStoredRecord>(key);
      if (existing?.phase === 'completed') {
        return { statusCode: existing.statusCode, body: existing.body };
      }
      if (!existing) return null;
    }
    return null;
  }

  async completeRequestIdempotency(
    scopeKey: string,
    payload: { statusCode: number; body: unknown },
    resultTtlSeconds: number,
  ): Promise<void> {
    const record: IdempotencyStoredRecord = {
      phase: 'completed',
      statusCode: payload.statusCode,
      body: payload.body,
      completedAt: Date.now(),
    };
    await this.redis.set(this.idempotencyKey(scopeKey), record, resultTtlSeconds);
  }

  async failRequestIdempotency(scopeKey: string): Promise<void> {
    await this.redis.del(this.idempotencyKey(scopeKey));
  }

  /**
   * Acquire a short-lived Redis lock. Use {@link runWithBusinessLock} when possible.
   * Correctness must come from DB constraints; this only reduces contention.
   */
  async acquireBusinessLock(resource: string, ttlSeconds: number): Promise<string | null> {
    return this.redis.acquireLock(this.businessLockKey(resource), ttlSeconds);
  }

  async renewBusinessLock(resource: string, token: string, ttlSeconds: number): Promise<boolean> {
    return this.redis.renewLock(this.businessLockKey(resource), token, ttlSeconds);
  }

  async releaseBusinessLock(resource: string, token: string): Promise<boolean> {
    return this.redis.releaseLock(this.businessLockKey(resource), token);
  }

  /**
   * Run `fn` under a Redis lock with optional renewal and hard operation timeout.
   * Lock is always released in `finally` (even on timeout).
   */
  async runWithBusinessLock<T>(
    resource: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    options?: RunWithBusinessLockOptions,
  ): Promise<T> {
    return this.runWithBusinessLocks([resource], ttlSeconds, fn, options);
  }

  /**
   * Acquire multiple locks in sorted order (deadlock avoidance), then run `fn`.
   */
  async runWithBusinessLocks<T>(
    resources: string[],
    ttlSeconds: number,
    fn: () => Promise<T>,
    options?: RunWithBusinessLockOptions,
  ): Promise<T> {
    const sorted = [...new Set(resources)].sort();
    const held: Array<{ resource: string; token: string }> = [];
    const lockKey = (resource: string) => this.businessLockKey(resource);

    for (const resource of sorted) {
      const token = await this.redis.acquireLock(lockKey(resource), ttlSeconds);
      if (!token) {
        await this.releaseHeldBusinessLocks(held);
        if (options?.onBusy) {
          return options.onBusy();
        }
        throw new BusinessLockBusyError(resource);
      }
      held.push({ resource, token });
    }

    const operationTimeoutMs =
      options?.operationTimeoutMs ?? Math.max(1000, (ttlSeconds - 1) * 1000);
    let renewTimer: ReturnType<typeof setInterval> | undefined;

    if (options?.renewIntervalMs && options.renewIntervalMs > 0) {
      const intervalMs = Math.min(options.renewIntervalMs, Math.floor((ttlSeconds * 1000) / 2));
      renewTimer = setInterval(() => {
        void Promise.all(
          held.map(({ resource, token }) =>
            this.redis.renewLock(lockKey(resource), token, ttlSeconds),
          ),
        );
      }, intervalMs);
      renewTimer.unref?.();
    }

    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(
              new LockOperationTimeoutError(sorted.join(','), operationTimeoutMs),
            );
          }, operationTimeoutMs);
          timer.unref?.();
        }),
      ]);
    } finally {
      if (renewTimer) clearInterval(renewTimer);
      await this.releaseHeldBusinessLocks(held);
    }
  }

  private async releaseHeldBusinessLocks(held: Array<{ resource: string; token: string }>) {
    for (const { resource, token } of [...held].reverse()) {
      await this.releaseBusinessLock(resource, token);
    }
  }

  private businessLockKey(resource: string): string {
    return `biz:${resource}`;
  }

  private cacheKey(namespace: string, id: string): string {
    return `cache:${namespace}:${id}`;
  }

  private loginSessionKey(userId: number | string, tokenId: string): string {
    return `auth:session:${userId}:${tokenId}`;
  }

  private tokenBlacklistKey(tokenId: string): string {
    return `auth:blacklist:${tokenId}`;
  }

  private verificationCodeKey(scene: string, target: string): string {
    return `verify:${scene}:${target}`;
  }

  private idempotencyKey(businessKey: string): string {
    return `idempotency:${businessKey}`;
  }
}
