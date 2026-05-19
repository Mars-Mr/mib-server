import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateStudentDto {
  @ApiProperty({ description: '学员姓名', example: '张三' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '头像 URL', example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '紧急联系人姓名', example: '李四' })
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional({ description: '紧急联系人电话', example: '13900139000' })
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional({ description: '与学员关系', example: '父亲' })
  @IsOptional()
  @IsString()
  emergencyRelation?: string;

  @ApiPropertyOptional({ description: '入会时间（ISO 8601）', example: '2026-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @ApiPropertyOptional({ description: '关联系统用户 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  userId?: string;
}
