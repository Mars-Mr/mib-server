import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DEFAULT_TENANT_CODE } from '../../../common/rbac/rbac-seed.data';

export class LoginDto {
  @ApiPropertyOptional({
    description: '租户编码（多租户 SaaS 必填；单租户可省略，默认 default）',
    example: DEFAULT_TENANT_CODE,
  })
  @IsOptional()
  @IsString()
  tenantCode?: string;

  @ApiProperty({ description: '登录用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '登录密码', example: 'password123', format: 'password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
