import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { DEFAULT_CURRENCY } from '../../../common/money/money';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class CreateOrderDto {
  @ApiPropertyOptional({ description: '学员 ID（散客订单可空）', example: API_UUID_EXAMPLE })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty({ description: '订单标题', example: '瑜伽年卡' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '订单金额（最小货币单位，CNY 为分）。例：3999.00 元 = 399900',
    example: 399900,
  })
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({
    description: 'ISO 4217 货币代码',
    example: DEFAULT_CURRENCY,
    default: DEFAULT_CURRENCY,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
