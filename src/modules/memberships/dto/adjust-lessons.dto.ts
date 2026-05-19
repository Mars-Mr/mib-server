import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class AdjustLessonsDto {
  @ApiProperty({ description: '课时变更量（正数增加，负数扣减）', example: -1 })
  @IsInt()
  delta: number;

  @ApiProperty({ description: '调整原因', example: '补课扣课时' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: '关联排课 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  scheduleId?: string;
}
