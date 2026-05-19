import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateScheduleDto {
  @ApiProperty({ description: '班级 ID', example: API_UUID_EXAMPLE })
  @IsString()
  classId: string;

  @ApiProperty({ description: '场地 ID', example: API_UUID_EXAMPLE })
  @IsString()
  venueId: string;

  @ApiProperty({ description: '教练 ID', example: API_UUID_EXAMPLE })
  @IsString()
  coachId: string;

  @ApiProperty({ description: '上课开始时间（ISO 8601）', example: '2026-05-20T10:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: '上课结束时间（ISO 8601）', example: '2026-05-20T11:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: '迟到宽限分钟数', example: 15, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;

  @ApiPropertyOptional({ description: '排课状态', enum: ScheduleStatus, example: ScheduleStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
