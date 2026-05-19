import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class ScheduleListQueryDto {
  @ApiPropertyOptional({ description: '排课开始时间下限（ISO 8601）', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: '排课开始时间上限（ISO 8601）', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: '班级 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: '教练 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  coachId?: string;
}
