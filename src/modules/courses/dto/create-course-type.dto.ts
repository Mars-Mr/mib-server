import { CourseKind } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseTypeDto {
  @IsEnum(CourseKind)
  kind: CourseKind;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultLessonDeduct?: number;
}
