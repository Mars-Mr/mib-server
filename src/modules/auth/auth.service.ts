import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { WinstonLoggersService } from '../../common/logger/winston-loggers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly winston: WinstonLoggersService,
  ) {}

  jwtSecret(): string {
    return process.env.JWT_SECRET || 'your_jwt_secret_key_123456';
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) {
      this.winston.logSecurity({
        type: 'auth_login_failure',
        reason: 'user_not_found',
        username: dto.username,
      });
      throw new UnauthorizedException('账号不存在');
    }

    const isPwdOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPwdOk) {
      this.winston.logSecurity({
        type: 'auth_login_failure',
        reason: 'bad_password',
        userId: user.id,
        username: user.username,
      });
      throw new UnauthorizedException('密码错误');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    this.winston.logSecurity({
      type: 'auth_login_success',
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token: this.jwtService.sign(payload, { secret: this.jwtSecret(), expiresIn: '7d' }),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('用户名已存在');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? UserRole.STAFF;

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        role,
      },
    });

    const payload = { sub: user.id, username: user.username, role: user.role };

    this.winston.logAudit({
      type: 'user_registered',
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token: this.jwtService.sign(payload, { secret: this.jwtSecret(), expiresIn: '7d' }),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }
}
