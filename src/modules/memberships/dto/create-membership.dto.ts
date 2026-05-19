import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateMembershipDto {
  @ApiProperty({ description: '学员 ID', example: API_UUID_EXAMPLE })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '会员卡名称', example: '瑜伽 20 次卡' })
  @IsString()
  title: string;

  @ApiProperty({ description: '总课时数', example: 20, minimum: 0 })
  @IsInt()
  @Min(0)
  totalLessons: number;

  @ApiProperty({ description: '剩余课时数', example: 20, minimum: 0 })
  @IsInt()
  @Min(0)
  remainingLessons: number;

  @ApiProperty({ description: '有效期开始（ISO 8601）', example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: '有效期结束（ISO 8601）', example: '2026-12-31T23:59:59.999Z' })
  @IsDateString()
  validTo: string;

  @ApiPropertyOptional({ description: '卡状态', enum: MembershipStatus, example: MembershipStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
