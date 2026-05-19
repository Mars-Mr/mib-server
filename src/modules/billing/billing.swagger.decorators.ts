import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../common/swagger/api-error.dto';
import { ApiProtectedErrorResponses } from '../../common/swagger/api-response.decorators';
import { OrderResponseDto } from '../../common/swagger/dto/responses.dto';
import {
  ORDER_PAID_RESPONSE_EXAMPLE,
  ORDER_PENDING_RESPONSE_EXAMPLE,
  PAYMENT_SIGNATURE_EXAMPLE,
} from './billing.swagger-examples';

export function ApiPaymentSignatureHeader() {
  return ApiHeader({
    name: 'X-Payment-Signature',
    required: true,
    description:
      'HMAC-SHA256(hex) 签名。对 canonical payload（orderNo\\nprovider\\nproviderTradeNo\\nevent\\npaidAt）计算，密钥为 PAYMENT_WEBHOOK_SECRET。',
    schema: { type: 'string', example: PAYMENT_SIGNATURE_EXAMPLE },
  });
}

export function ApiCreateOrderResponses() {
  return applyDecorators(
    ApiCreatedResponse({
      description: '创建成功；相同 Idempotency-Key 重复请求返回已存在的订单（可能仍为 PENDING 或已 PAID）',
      type: OrderResponseDto,
      content: {
        'application/json': {
          examples: {
            pending: {
              summary: '待支付',
              value: ORDER_PENDING_RESPONSE_EXAMPLE,
            },
            paid: {
              summary: '幂等重放（订单已被回调支付）',
              value: ORDER_PAID_RESPONSE_EXAMPLE,
            },
          },
        },
      },
    }),
    ApiProtectedErrorResponses(),
  );
}

export function ApiListOrdersResponse() {
  return applyDecorators(
    ApiOkResponse({
      description: '订单列表（按创建时间倒序）',
      type: OrderResponseDto,
      isArray: true,
      schema: {
        example: [ORDER_PAID_RESPONSE_EXAMPLE, ORDER_PENDING_RESPONSE_EXAMPLE],
      },
    }),
    ApiProtectedErrorResponses(),
  );
}

export function ApiPaymentWebhookResponses() {
  return applyDecorators(
    ApiPaymentSignatureHeader(),
    ApiOkResponse({
      description: '处理成功；重复回调返回当前订单状态（幂等）',
      type: OrderResponseDto,
      content: {
        'application/json': {
          examples: {
            paid: {
              summary: '支付成功（或重复回调）',
              value: ORDER_PAID_RESPONSE_EXAMPLE,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({ description: '参数错误或订单状态不允许', type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ description: 'X-Payment-Signature 无效', type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ description: '订单不存在', type: ApiErrorResponseDto }),
    ApiConflictResponse({ description: '订单已支付但交易号不一致等冲突', type: ApiErrorResponseDto }),
  );
}
