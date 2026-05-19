import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  courseTypeId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  coachId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
