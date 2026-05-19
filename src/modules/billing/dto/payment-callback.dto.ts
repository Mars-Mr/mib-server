import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ORDER_NO_EXAMPLE,
  PAYMENT_CALLBACK_PAID_REQUEST_EXAMPLE,
  PAYMENT_CALLBACK_REFUNDED_REQUEST_EXAMPLE,
} from '../billing.swagger-examples';

export enum PaymentCallbackEvent {
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export class PaymentCallbackDto {
  @ApiProperty({ description: '商户订单号', example: ORDER_NO_EXAMPLE })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  orderNo: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.MOCK })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ description: '支付平台交易号', example: 'MOCK_TX_20260519120000' })
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  providerTradeNo: string;

  @ApiProperty({ enum: PaymentCallbackEvent, example: PaymentCallbackEvent.PAID })
  @IsEnum(PaymentCallbackEvent)
  event: PaymentCallbackEvent;

  @ApiPropertyOptional({ description: '支付/退款完成时间（ISO 8601）', example: '2026-05-19T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}

export const PAYMENT_CALLBACK_SWAGGER_EXAMPLES = {
  paid: {
    summary: '支付成功通知',
    value: PAYMENT_CALLBACK_PAID_REQUEST_EXAMPLE,
  },
  refunded: {
    summary: '退款成功通知',
    value: PAYMENT_CALLBACK_REFUNDED_REQUEST_EXAMPLE,
  },
};
