import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

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

  async acquireBusinessLock(resource: string, ttlSeconds: number): Promise<string | null> {
    return this.redis.acquireLock(`biz:${resource}`, ttlSeconds);
  }

  async releaseBusinessLock(resource: string, token: string): Promise<boolean> {
    return this.redis.releaseLock(`biz:${resource}`, token);
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
