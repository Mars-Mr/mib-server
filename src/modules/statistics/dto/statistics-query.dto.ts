import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class StatisticsDateRangeQueryDto {
  @ApiPropertyOptional({ description: '统计开始时间（ISO 8601）', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: '统计结束时间（ISO 8601）', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class AttendanceStatisticsQueryDto extends StatisticsDateRangeQueryDto {
  @ApiPropertyOptional({ description: '学员 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: '班级 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  classId?: string;
}

export class LessonStatisticsQueryDto extends StatisticsDateRangeQueryDto {
  @ApiPropertyOptional({ description: '学员 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  studentId?: string;
}
