import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import type { EnvConfig } from '../../common/config/env.types';
import { RedisBusinessService } from '../../infrastructure/redis/redis-business.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

export type LoginGuardResult =
  | { ok: true }
  | { ok: false; kind: 'locked'; retryAfterSeconds: number }
  | { ok: false; kind: 'rate_limited'; retryAfterSeconds: number };

@Injectable()
export class AuthLoginSecurityService {
  constructor(
    private readonly redisBiz: RedisBusinessService,
    private readonly redis: RedisService,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  async assertCanAttemptLogin(ip: string, username: string): Promise<void> {
    const result = await this.checkCanAttemptLogin(ip, username);
    if (result.ok === false) {
      if (result.kind === 'locked') {
        throw new ForbiddenException(
          `登录失败次数过多，账号已锁定，请 ${result.retryAfterSeconds} 秒后重试`,
        );
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: '登录尝试过于频繁，请稍后再试',
          retryAfterSeconds: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async checkCanAttemptLogin(ip: string, username: string): Promise<LoginGuardResult> {
    const lockTtl = await this.redis.ttl(this.lockKey(username));
    if (lockTtl > 0) {
      return { ok: false, kind: 'locked', retryAfterSeconds: lockTtl };
    }

    const window = this.env.AUTH_LOGIN_WINDOW_SECONDS;
    const limit = this.env.AUTH_LOGIN_MAX_ATTEMPTS;

    const ipLimit = await this.redisBiz.checkRateLimit('login:ip', ip, limit, window);
    if (!ipLimit.allowed) {
      return { ok: false, kind: 'rate_limited', retryAfterSeconds: ipLimit.ttl };
    }

    const userLimit = await this.redisBiz.checkRateLimit('login:user', username, limit, window);
    if (!userLimit.allowed) {
      return { ok: false, kind: 'rate_limited', retryAfterSeconds: userLimit.ttl };
    }

    return { ok: true };
  }

  /** Record a failed attempt: rate counters + strike counter; may lock the account. */
  async recordLoginFailure(
    ip: string,
    username: string,
  ): Promise<{ locked: boolean; lockSeconds: number }> {
    const window = this.env.AUTH_LOGIN_WINDOW_SECONDS;
    const limit = this.env.AUTH_LOGIN_MAX_ATTEMPTS;
    await this.redisBiz.checkRateLimit('login:ip', ip, limit, window);
    await this.redisBiz.checkRateLimit('login:user', username, limit, window);

    const strikesKey = this.strikesKey(username);
    const strikes = await this.redis.incr(strikesKey, window);
    const lockSeconds = this.env.AUTH_LOGIN_LOCK_SECONDS;

    if (strikes >= this.env.AUTH_LOGIN_LOCK_AFTER_FAILURES) {
      await this.redis.set(this.lockKey(username), '1', lockSeconds);
      return { locked: true, lockSeconds };
    }

    return { locked: false, lockSeconds };
  }

  async clearLoginFailures(username: string): Promise<void> {
    await this.redis.del(this.strikesKey(username), this.lockKey(username));
  }

  private lockKey(username: string): string {
    return `auth:login:lock:${username}`;
  }

  private strikesKey(username: string): string {
    return `auth:login:strikes:${username}`;
  }
}
