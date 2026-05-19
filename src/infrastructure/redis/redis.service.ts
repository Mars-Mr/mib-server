import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import type { EnvConfig } from '../../common/config/env.types';
import { WinstonLoggersService } from '../../common/logger/winston-loggers.service';
import { buildRedisOptions, getRedisConfigFromEnv } from './redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;
  private readonly config: ReturnType<typeof getRedisConfigFromEnv>;
  private readonly nodeEnv: EnvConfig['NODE_ENV'];
  private ready = false;

  constructor(
    private readonly winston: WinstonLoggersService,
    @Inject(ENV_CONFIG) env: EnvConfig,
  ) {
    this.nodeEnv = env.NODE_ENV;
    this.config = getRedisConfigFromEnv(env);
    this.client = new Redis(buildRedisOptions(this.config));
    this.bindEvents();
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.ready = true;
      this.winston.logApplication('info', 'Redis connected', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
      });
    } catch (error) {
      this.ready = false;
      this.winston.logApplication('error', 'Redis initial connection failed', {
        error: this.formatError(error),
      });
      if (this.nodeEnv === 'production') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.ready;
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.ping();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, error: this.formatError(error) };
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    return this.deserialize<T>(value);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<'OK'> {
    const payload = this.serialize(value);
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, payload, 'EX', ttlSeconds);
    }
    return this.client.set(key, payload);
  }

  async setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const payload = this.serialize(value);
    const result = ttlSeconds && ttlSeconds > 0 ? await this.client.set(key, payload, 'EX', ttlSeconds, 'NX') : await this.client.set(key, payload, 'NX');
    return result === 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.expire(key, ttlSeconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1 && ttlSeconds && ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T> | T): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async rememberJson<T>(key: string, ttlSeconds: number, factory: () => Promise<T> | T): Promise<T> {
    return this.getOrSet(key, ttlSeconds, factory);
  }

  /**
   * Best-effort mutual exclusion (single Redis primary). Not a correctness guarantee —
   * pair with DB unique constraints / serializable transactions for final safety.
   */
  async acquireLock(key: string, ttlSeconds: number, token = `${process.pid}:${Date.now()}:${Math.random()}`): Promise<string | null> {
    const locked = await this.setNx(`lock:${key}`, token, ttlSeconds);
    return locked ? token : null;
  }

  /** Extend TTL only if the holder token still matches. */
  async renewLock(key: string, token: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('expire', KEYS[1], ARGV[2])
      end
      return 0
    `;
    const result = await this.client.eval(script, 1, lockKey, token, String(ttlSeconds));
    return result === 1;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      end
      return 0
    `;
    const result = await this.client.eval(script, 1, lockKey, token);
    return result === 1;
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; current: number; ttl: number }> {
    const current = await this.incr(`rate:${key}`, windowSeconds);
    const ttl = await this.ttl(`rate:${key}`);
    return { allowed: current <= limit, current, ttl };
  }

  async publish(channel: string, message: unknown): Promise<number> {
    return this.client.publish(channel, this.serialize(message));
  }

  private bindEvents() {
    this.client.on('ready', () => {
      this.ready = true;
      this.winston.logApplication('info', 'Redis ready');
    });
    this.client.on('close', () => {
      this.ready = false;
      this.winston.logApplication('warn', 'Redis connection closed');
    });
    this.client.on('reconnecting', delay => {
      this.ready = false;
      this.winston.logApplication('warn', 'Redis reconnecting', { delayMs: delay });
    });
    this.client.on('error', error => {
      this.ready = false;
      this.winston.logApplication('error', 'Redis error', { error: error.message });
    });
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown Redis error';
    }
  }

  private serialize(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
}
