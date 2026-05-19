import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseKind } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseTypeDto {
  @ApiProperty({ description: '课程种类', enum: CourseKind, example: CourseKind.GROUP })
  @IsEnum(CourseKind)
  kind: CourseKind;

  @ApiProperty({ description: '课程类型名称', example: '团课瑜伽' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '默认单次扣课时数', example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultLessonDeduct?: number;
}
