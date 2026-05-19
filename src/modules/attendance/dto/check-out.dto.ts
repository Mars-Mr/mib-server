import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CheckOutDto {
  @ApiProperty({ description: '学员 ID', example: API_UUID_EXAMPLE })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '排课 ID', example: API_UUID_EXAMPLE })
  @IsString()
  scheduleId: string;
}
