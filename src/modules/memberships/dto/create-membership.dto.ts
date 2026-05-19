import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MembershipStatus } from '@prisma/client';

export class CreateMembershipDto {
  @IsString()
  studentId: string;

  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  totalLessons: number;

  @IsInt()
  @Min(0)
  remainingLessons: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
