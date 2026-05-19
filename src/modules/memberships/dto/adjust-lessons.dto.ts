import { IsInt, IsOptional, IsString } from 'class-validator';

export class AdjustLessonsDto {
  @IsInt()
  delta: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;
}
