import { AttendanceMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  studentId: string;

  @IsString()
  scheduleId: string;

  @IsEnum(AttendanceMethod)
  method: AttendanceMethod;

  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
