import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import type { EnvConfig } from '../../common/config/env.types';
import { getJwtExpiresIn } from '../../common/config/env';
import { AuthLoginSecurityService } from './auth-login-security.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ENV_CONFIG],
      useFactory: (env: EnvConfig) => ({
        secret: env.JWT_SECRET,
        signOptions: { expiresIn: getJwtExpiresIn() },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthLoginSecurityService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
