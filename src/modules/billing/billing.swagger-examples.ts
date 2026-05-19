import { OrderStatus, PaymentProvider } from '@prisma/client';
import { API_UUID_EXAMPLE } from '../../common/swagger/api-param.decorators';
/** Swagger / 文档用：与开发环境默认 `PAYMENT_WEBHOOK_SECRET` 匹配的示例签名 */
export const PAYMENT_SIGNATURE_EXAMPLE =
  'cf64de0a145b2aa45199d084d72ed369a63f2abbe02a298db8d78a47ac327f6d';

export const IDEMPOTENCY_KEY_EXAMPLE = 'create-order-7f3c2a1b-9e4d-4b2c-8a1f6d3e5c7b';

export const ORDER_NO_EXAMPLE = 'ORD1716123456A1B2C3D4';

export const CREATE_ORDER_REQUEST_EXAMPLE = {
  studentId: API_UUID_EXAMPLE,
  title: '瑜伽年卡',
  amountCents: 399900,
  currency: 'CNY',
};

export const ORDER_PENDING_RESPONSE_EXAMPLE = {
  id: API_UUID_EXAMPLE,
  orderNo: ORDER_NO_EXAMPLE,
  studentId: API_UUID_EXAMPLE,
  title: '瑜伽年卡',
  amountCents: 399900,
  currency: 'CNY',
  amount: '3999.00',
  status: OrderStatus.PENDING,
  paymentProvider: null,
  providerTradeNo: null,
  idempotencyKey: IDEMPOTENCY_KEY_EXAMPLE,
  paidAt: null,
  refundedAt: null,
  createdAt: '2026-05-19T08:00:00.000Z',
  updatedAt: '2026-05-19T08:00:00.000Z',
  student: {
    id: API_UUID_EXAMPLE,
    name: '张三',
    phone: '13800000000',
  },
};

export const ORDER_PAID_RESPONSE_EXAMPLE = {
  ...ORDER_PENDING_RESPONSE_EXAMPLE,
  status: OrderStatus.PAID,
  paymentProvider: PaymentProvider.MOCK,
  providerTradeNo: 'MOCK_TX_20260519120000',
  paidAt: '2026-05-19T12:00:00.000Z',
};

export const PAYMENT_CALLBACK_PAID_REQUEST_EXAMPLE = {
  orderNo: ORDER_NO_EXAMPLE,
  provider: PaymentProvider.MOCK,
  providerTradeNo: 'MOCK_TX_20260519120000',
  event: 'paid',
  paidAt: '2026-05-19T12:00:00.000Z',
};

export const PAYMENT_CALLBACK_REFUNDED_REQUEST_EXAMPLE = {
  orderNo: ORDER_NO_EXAMPLE,
  provider: PaymentProvider.MOCK,
  providerTradeNo: 'MOCK_TX_20260519120000',
  event: 'refunded',
  paidAt: '2026-05-20T10:00:00.000Z',
};

/** 参与 HMAC 的 canonical 字符串（换行分隔，末行 paidAt 可空） */
export const PAYMENT_SIGNATURE_PAYLOAD_EXAMPLE =
  'ORD1716123456A1B2C3D4\nMOCK\nMOCK_TX_20260519120000\npaid\n2026-05-19T12:00:00.000Z';

export const PAYMENT_WEBHOOK_OPERATION_DESCRIPTION = [
  '支付平台异步通知（无需 JWT）。',
  '',
  '**验签**：请求头 `X-Payment-Signature` 为 canonical payload 的 HMAC-SHA256（hex）。',
  '',
  '**Canonical payload**（UTF-8，字段以 `\\n` 连接）：',
  '```',
  'orderNo',
  'provider',
  'providerTradeNo',
  'event',
  'paidAt（可省略，省略时为空字符串）',
  '```',
  '',
  '示例 payload：',
  '```',
  PAYMENT_SIGNATURE_PAYLOAD_EXAMPLE,
  '```',
  '',
  '开发环境默认密钥见 `.env.example` 中 `PAYMENT_WEBHOOK_SECRET`；上方示例请求体与 `X-Payment-Signature` 示例值配套，可直接在 Swagger 中试调。',
  '',
  '**幂等**：同一 `orderNo` + `provider` + `providerTradeNo` 重复回调返回已支付订单，不会重复记账。',
].join('\n');

export const CREATE_ORDER_OPERATION_DESCRIPTION = [
  '创建待支付订单（`status=PENDING`）。',
  '',
  '**必须**携带请求头 `Idempotency-Key`：',
  '- 用户重复点击、前端重试、网络超时后重放，只要 Key 相同即返回同一订单；',
  '- Key 建议为 UUID 或「业务类型 + 客户端请求 ID」。',
  '',
  '支付结果由 `POST /webhooks/payment` 回调更新，不在本接口直接写 `paidAt`。',
].join('\n');
