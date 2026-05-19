import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { UserBehavior } from '../../common/decorators/user-behavior.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ApiAuthProfileResponses,
  ApiCreatedData,
  ApiLoginResponses,
  ApiMessageOk,
  ApiOkData,
} from '../../common/swagger/api-response.decorators';
import { LoginResponseDto, OkResponseDto } from '../../common/swagger/dto/responses.dto';
import { buildLoginClientContext } from './auth-client.util';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '用户登录',
    description: '校验用户名密码，返回 JWT。多租户场景可传 `tenantCode`；失败过多将触发限流（429）。',
  })
  @ApiLoginResponses()
  @AuditAction('用户登录')
  @UserBehavior('用户登录')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, buildLoginClientContext(req));
  }

  @Post('register')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '创建用户（管理员）',
    description: '仅 ADMIN；需在请求头携带 JWT 与租户上下文（`X-Tenant-Id`）。',
  })
  @ApiCreatedData(LoginResponseDto, '用户创建成功，返回与登录相同结构')
  @AuditAction('管理员创建用户')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('change-password')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '修改密码',
    description: '成功后返回新 JWT（旧 token 因 tokenVersion 递增而失效）。',
  })
  @ApiOkData(LoginResponseDto, { description: '密码已更新，返回新 token' })
  @AuditAction('修改密码')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.authService.changePassword(req.user!.userId, dto);
  }

  @Post('logout')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '退出登录', description: '将当前 JWT 加入黑名单。' })
  @ApiOkData(OkResponseDto, { description: '退出成功' })
  logout(@Req() req: Request) {
    return this.authService.logout(req.user!);
  }

  @Get('admin-only')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '管理员探活', description: '仅 ADMIN 可访问，用于验证角色权限。' })
  @ApiMessageOk('管理员专属接口访问成功')
  adminOnly() {
    return { msg: '管理员专属接口访问成功' };
  }

  @Get('profile')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '当前用户信息', description: '返回 JWT 中的 userId、username、role。' })
  @ApiAuthProfileResponses()
  profile(@Req() req: Request) {
    return {
      userId: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
    };
  }
}
