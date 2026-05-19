import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CheckInDto {
  @ApiProperty({ description: '学员 ID', example: API_UUID_EXAMPLE })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '排课 ID', example: API_UUID_EXAMPLE })
  @IsString()
  scheduleId: string;

  @ApiProperty({ description: '签到方式', enum: AttendanceMethod, example: AttendanceMethod.QR })
  @IsEnum(AttendanceMethod)
  method: AttendanceMethod;

  @ApiPropertyOptional({ description: '二维码签到 token（method=QR 时必填）', example: 'qr-token-abc' })
  @IsOptional()
  @IsString()
  qrToken?: string;

  @ApiPropertyOptional({ description: '纬度（GPS 签到）', example: 31.2304 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度（GPS 签到）', example: 121.4737 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
