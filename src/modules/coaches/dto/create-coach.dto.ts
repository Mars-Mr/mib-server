import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateCoachDto {
  @ApiProperty({ description: '教练姓名', example: '王教练' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '联系电话', example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '简介', example: '十年教学经验' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: '关联系统用户 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  userId?: string;
}
