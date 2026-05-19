import { randomUUID } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { getJwtExpiresIn, getJwtExpiresInSeconds } from '../../common/config/env';
import { WinstonLoggersService } from '../../common/logger/winston-loggers.service';
import { DEFAULT_TENANT_CODE } from '../../common/rbac/rbac-seed.data';
import { getAccessContext } from '../../common/rbac/request-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { runWithoutTenantScope } from '../../infrastructure/prisma/tenant/tenant-context';
import { RedisBusinessService } from '../../infrastructure/redis/redis-business.service';
import type { LoginClientContext } from './auth-client.util';
import { AuthLoginSecurityService } from './auth-login-security.service';
import type { AuthUser, JwtPayload } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const INVALID_CREDENTIALS_MSG = '用户名或密码错误';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly winston: WinstonLoggersService,
    private readonly loginSecurity: AuthLoginSecurityService,
    private readonly redisBiz: RedisBusinessService,
  ) {}

  async login(dto: LoginDto, client: LoginClientContext) {
    await this.loginSecurity.assertCanAttemptLogin(client.ip, dto.username);

    const user = await runWithoutTenantScope(async () => {
      const tenant = await this.resolveTenantByCode(dto.tenantCode);
      return this.prisma.user.findFirst({
        where: { tenantId: tenant.id, username: dto.username },
      });
    });
    if (!user) {
      await this.loginSecurity.recordLoginFailure(client.ip, dto.username);
      await this.recordLoginEvent({
        username: dto.username,
        success: false,
        reason: 'user_not_found',
        client,
      });
      this.logLoginFailure('user_not_found', dto.username, client);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    const isPwdOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPwdOk) {
      const lock = await this.loginSecurity.recordLoginFailure(client.ip, dto.username);
      await this.recordLoginEvent({
        userId: user.id,
        username: dto.username,
        success: false,
        reason: 'bad_password',
        client,
      });
      this.logLoginFailure('bad_password', dto.username, client, user.id, lock.locked);
      if (lock.locked) {
        throw new UnauthorizedException(
          `登录失败次数过多，账号已锁定 ${lock.lockSeconds} 秒`,
        );
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    await this.loginSecurity.clearLoginFailures(dto.username);

    await this.recordLoginEvent({
      userId: user.id,
      username: user.username,
      success: true,
      client,
    });

    this.winston.logSecurity({
      type: 'auth_login_success',
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: client.ip,
      deviceHint: client.deviceHint,
      userAgent: client.userAgent,
    });

    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    const ctx = getAccessContext();
    const tenantId = ctx?.activeTenantId ?? ctx?.tenantIds[0];
    if (!tenantId) throw new ConflictException('无法确定租户，请设置 X-Tenant-Id');

    const exists = await this.prisma.user.findFirst({
      where: { tenantId, username: dto.username },
    });
    if (exists) throw new ConflictException('用户名已存在');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? UserRole.STAFF;

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        username: dto.username,
        passwordHash,
        role,
      },
    });

    this.winston.logAudit({
      type: 'admin_audit',
      action: 'user_registered',
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return this.buildAuthResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('当前密码错误');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    this.winston.logSecurity({
      type: 'auth_password_changed',
      userId: updated.id,
      username: updated.username,
      tokenVersion: updated.tokenVersion,
    });

    this.winston.logAudit({
      type: 'admin_audit',
      action: 'password_changed',
      userId: updated.id,
      username: updated.username,
      role: updated.role,
    });

    return this.buildAuthResponse(updated);
  }

  async logout(user: AuthUser) {
    await this.redisBiz.blacklistToken(user.jti, getJwtExpiresInSeconds());
    this.winston.logSecurity({
      type: 'auth_logout',
      userId: user.userId,
      username: user.username,
      jti: user.jti,
    });
    return { ok: true };
  }

  private buildAuthResponse(user: { id: string; username: string; role: UserRole; tokenVersion: number }) {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti,
      tv: user.tokenVersion,
    };

    return {
      token: this.jwtService.sign(payload, { expiresIn: getJwtExpiresIn() }),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  private async recordLoginEvent(params: {
    userId?: string;
    username: string;
    success: boolean;
    reason?: string;
    client: LoginClientContext;
  }) {
    await this.prisma.loginEvent.create({
      data: {
        userId: params.userId,
        username: params.username,
        success: params.success,
        reason: params.reason,
        ip: params.client.ip,
        userAgent: params.client.userAgent?.slice(0, 512),
        deviceHint: params.client.deviceHint,
      },
    });
  }

  private async resolveTenantByCode(code?: string) {
    const tenantCode = code?.trim() || DEFAULT_TENANT_CODE;
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
    if (!tenant) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }
    return tenant;
  }

  private logLoginFailure(
    reason: string,
    username: string,
    client: LoginClientContext,
    userId?: string,
    locked?: boolean,
  ) {
    this.winston.logSecurity({
      type: 'auth_login_failure',
      reason,
      username,
      userId,
      ip: client.ip,
      deviceHint: client.deviceHint,
      userAgent: client.userAgent,
      locked,
    });
  }
}
