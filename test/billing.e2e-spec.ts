import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { OrderStatus, PaymentProvider } from '@prisma/client';
import { App } from 'supertest/types';
import { DEV_PAYMENT_WEBHOOK_SECRET } from '../src/common/config/env.constants';
import {
  buildPaymentCallbackSignPayload,
  signPaymentCallback,
} from '../src/modules/billing/billing-payment-signature';
import { PaymentCallbackEvent } from '../src/modules/billing/dto/payment-callback.dto';
import { createE2eApp } from './helpers/e2e-app';
import { disconnectTestPrisma, getTestPrisma, resetDatabase } from './helpers/db';
import { api, authedApi } from './helpers/http';
import { seedE2eBase } from './helpers/seed';

describe('Billing (e2e)', () => {
  let app: INestApplication<App>;
  let staffToken: string;
  let studentId: string;

  beforeAll(async () => {
    await resetDatabase();
    const seed = await seedE2eBase(getTestPrisma());
    studentId = seed.studentId;
    app = await createE2eApp();

    const staffLogin = await api(app).post('/auth/login').send({ username: 'e2e_staff', password: '123456' });
    staffToken = staffLogin.body.token;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  function signCallback(body: Record<string, string>) {
    const payload = buildPaymentCallbackSignPayload({
      orderNo: body.orderNo,
      provider: body.provider as PaymentProvider,
      providerTradeNo: body.providerTradeNo,
      event: body.event,
      paidAt: body.paidAt,
    });
    return signPaymentCallback(payload, DEV_PAYMENT_WEBHOOK_SECRET);
  }

  it('requires Idempotency-Key to create order', async () => {
    await authedApi(app, staffToken)
      .post('/orders')
      .send({ title: '年卡', amountCents: 399900, studentId })
      .expect(400);
  });

  it('creates order once per idempotency key and supports payment callback', async () => {
    const idempotencyKey = 'e2e-order-create-001';

    const first = await authedApi(app, staffToken)
      .post('/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send({ title: '年卡', amountCents: 399900, studentId })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const second = await authedApi(app, staffToken)
      .post('/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send({ title: '年卡', amount: 9999, studentId })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.orderNo).toBe(first.body.orderNo);
    expect(second.body.status).toBe(OrderStatus.PENDING);
    expect(second.body.amountCents).toBe(399900);
    expect(second.body.amount).toBe('3999.00');

    const callbackBody = {
      orderNo: first.body.orderNo as string,
      provider: PaymentProvider.MOCK,
      providerTradeNo: 'MOCK_E2E_TX_001',
      event: PaymentCallbackEvent.PAID,
      paidAt: new Date().toISOString(),
    };
    const signature = signCallback(callbackBody);

    const paid = await api(app)
      .post('/webhooks/payment')
      .set('X-Payment-Signature', signature)
      .send(callbackBody)
      .expect(200);

    expect(paid.body.status).toBe(OrderStatus.PAID);
    expect(paid.body.providerTradeNo).toBe('MOCK_E2E_TX_001');
    expect(paid.body.paidAt).toBeDefined();

    const replay = await api(app)
      .post('/webhooks/payment')
      .set('X-Payment-Signature', signature)
      .send(callbackBody)
      .expect(200);

    expect(replay.body.id).toBe(paid.body.id);
    expect(replay.body.status).toBe(OrderStatus.PAID);

    const list = await authedApi(app, staffToken).get('/orders').expect(200);
    expect(list.body.some((o: { id: string }) => o.id === first.body.id)).toBe(true);
  });

  it('rejects payment callback without valid signature', async () => {
    await api(app)
      .post('/webhooks/payment')
      .set('X-Payment-Signature', 'invalid')
      .send({
        orderNo: 'ORD_NOT_EXIST',
        provider: PaymentProvider.MOCK,
        providerTradeNo: 'MOCK_TX_BAD',
        event: PaymentCallbackEvent.PAID,
      })
      .expect(401);
  });
});
