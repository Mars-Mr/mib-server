import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_CONFIG } from '../../../common/config/env-config.token';
import type { EnvConfig } from '../../../common/config/env.types';
import { LEGACY_ORG_HEADER, TENANT_HEADER } from '../../../common/decorators/tenant-scope.decorator';
import { AccessContextService } from '../../../common/rbac/access-context.service';
import { runWithoutTenantScope } from '../../../infrastructure/prisma/tenant/tenant-context';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RedisBusinessService } from '../../../infrastructure/redis/redis-business.service';
import type { AuthUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ENV_CONFIG) env: EnvConfig,
    private readonly prisma: PrismaService,
    private readonly redisBiz: RedisBusinessService,
    private readonly accessContext: AccessContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(
    req: { headers?: Record<string, string | string[] | undefined> },
    payload: JwtPayload,
  ): Promise<AuthUser> {
    if (!payload?.sub || !payload.jti || payload.tv === undefined) {
      throw new UnauthorizedException('无效的令牌');
    }

    if (await this.redisBiz.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('令牌已失效');
    }

    const user = await runWithoutTenantScope(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, role: true, tokenVersion: true },
      }),
    );

    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('令牌已失效，请重新登录');
    }

    const headerRaw =
      req?.headers?.[TENANT_HEADER] ?? req?.headers?.[LEGACY_ORG_HEADER];
    const activeTenant =
      typeof headerRaw === 'string' ? headerRaw : Array.isArray(headerRaw) ? headerRaw[0] : undefined;

    const access = await this.accessContext.build(user.id, user.role as UserRole, activeTenant);

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      jti: payload.jti,
      permissions: access.permissions,
      access,
    };
  }
}
