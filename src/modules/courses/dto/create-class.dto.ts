import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateClassDto {
  @ApiProperty({ description: '课程类型 ID', example: API_UUID_EXAMPLE })
  @IsString()
  courseTypeId: string;

  @ApiProperty({ description: '班级名称', example: '周一晚瑜伽班' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '主教练 ID', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  coachId?: string;

  @ApiPropertyOptional({ description: '最大学员数', example: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
