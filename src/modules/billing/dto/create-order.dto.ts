import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateOrderDto {
  @ApiPropertyOptional({ description: '学员 ID（散客订单可空）', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty({ description: '订单标题', example: '瑜伽年卡' })
  @IsString()
  title: string;

  @ApiProperty({ description: '订单金额', example: 3999 })
  @IsNumber()
  amount: number;
}
