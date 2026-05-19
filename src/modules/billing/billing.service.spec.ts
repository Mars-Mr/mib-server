import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import { DEV_PAYMENT_WEBHOOK_SECRET } from '../../common/config/env.constants';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { signPaymentCallback, buildPaymentCallbackSignPayload } from './billing-payment-signature';
import { BillingService } from './billing.service';
import { PaymentCallbackEvent } from './dto/payment-callback.dto';

describe('BillingService', () => {
  let service: BillingService;

  const prisma = {
    student: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      findFirst: jest.fn<() => Promise<unknown>>(),
    },
    order: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      findFirst: jest.fn<() => Promise<unknown>>(),
      create: jest.fn<() => Promise<unknown>>(),
      findMany: jest.fn<() => Promise<unknown[]>>(),
      findUniqueOrThrow: jest.fn<() => Promise<unknown>>(),
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
    },
    $transaction: jest.fn<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ENV_CONFIG,
          useValue: { PAYMENT_WEBHOOK_SECRET: DEV_PAYMENT_WEBHOOK_SECRET },
        },
      ],
    }).compile();
    service = module.get(BillingService);
  });

  it('returns existing order for duplicate idempotency key', async () => {
    const existing = {
      id: 'o1',
      idempotencyKey: 'key-abc',
      status: OrderStatus.PENDING,
      amountCents: 9950,
      currency: 'CNY',
    };
    prisma.order.findUnique.mockResolvedValue(existing);

    const result = await service.createOrder({ title: 'card', amountCents: 9950 }, 'key-abc');

    expect(result).toMatchObject({ id: 'o1', amountCents: 9950, amount: '99.50' });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('creates pending order with idempotency key', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    const created = {
      id: 'o1',
      orderNo: 'ORD1',
      status: OrderStatus.PENDING,
      idempotencyKey: 'key-new',
      amountCents: 9950,
      currency: 'CNY',
    };
    prisma.order.create.mockResolvedValue(created);

    const result = await service.createOrder({ title: 'card', amountCents: 9950 }, 'key-new');

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'card',
          amountCents: 9950,
          currency: 'CNY',
          status: OrderStatus.PENDING,
          idempotencyKey: 'key-new',
        }),
      }),
    );
    expect(result).toMatchObject({ id: 'o1', orderNo: 'ORD1', amountCents: 9950 });
  });

  it('replays create after unique violation on idempotency key', async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'o-winner',
        idempotencyKey: 'key-dup',
        amountCents: 1000,
        currency: 'CNY',
      });
    const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.order.create.mockRejectedValue(uniqueError);

    const result = await service.createOrder({ title: 'card', amountCents: 1000 }, 'key-dup');

    expect(result).toMatchObject({ id: 'o-winner', idempotencyKey: 'key-dup', amountCents: 1000 });
  });

  it('rejects payment callback with invalid signature', async () => {
    const dto = {
      orderNo: 'ORD1',
      provider: PaymentProvider.MOCK,
      providerTradeNo: 'TX1',
      event: PaymentCallbackEvent.PAID,
    };
    await expect(service.handlePaymentCallback(dto, 'bad-sig')).rejects.toThrow(
      'Invalid payment signature',
    );
  });

  it('marks order paid idempotently on duplicate callback', async () => {
    const dto = {
      orderNo: 'ORD1',
      provider: PaymentProvider.MOCK,
      providerTradeNo: 'TX1',
      event: PaymentCallbackEvent.PAID,
    };
    const payload = buildPaymentCallbackSignPayload(dto);
    const signature = signPaymentCallback(payload, DEV_PAYMENT_WEBHOOK_SECRET);

    const paidOrder = {
      id: 'o1',
      orderNo: 'ORD1',
      status: OrderStatus.PAID,
      paymentProvider: PaymentProvider.MOCK,
      providerTradeNo: 'TX1',
    };
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      ...paidOrder,
      amountCents: 1000,
      currency: 'CNY',
      student: null,
    });

    const result = await service.handlePaymentCallback(dto, signature);

    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ orderNo: 'ORD1', status: OrderStatus.PAID });
  });

  it('updates pending order to paid on first callback', async () => {
    const dto = {
      orderNo: 'ORD1',
      provider: PaymentProvider.MOCK,
      providerTradeNo: 'TX1',
      event: PaymentCallbackEvent.PAID,
    };
    const payload = buildPaymentCallbackSignPayload(dto);
    const signature = signPaymentCallback(payload, DEV_PAYMENT_WEBHOOK_SECRET);

    prisma.order.findUnique
      .mockResolvedValueOnce({
        id: 'o1',
        orderNo: 'ORD1',
        status: OrderStatus.PENDING,
        paymentProvider: null,
        providerTradeNo: null,
      })
      .mockResolvedValueOnce({
        id: 'o1',
        orderNo: 'ORD1',
        status: OrderStatus.PAID,
        paymentProvider: PaymentProvider.MOCK,
        providerTradeNo: 'TX1',
      });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: 'o1',
      orderNo: 'ORD1',
      status: OrderStatus.PAID,
      amountCents: 1000,
      currency: 'CNY',
      student: null,
    });

    await service.handlePaymentCallback(dto, signature);

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { orderNo: 'ORD1', status: OrderStatus.PENDING },
      data: expect.objectContaining({
        status: OrderStatus.PAID,
        paymentProvider: PaymentProvider.MOCK,
        providerTradeNo: 'TX1',
      }),
    });
  });

  it('throws when paying already paid order with different trade no', async () => {
    const dto = {
      orderNo: 'ORD1',
      provider: PaymentProvider.MOCK,
      providerTradeNo: 'TX_OTHER',
      event: PaymentCallbackEvent.PAID,
    };
    const payload = buildPaymentCallbackSignPayload(dto);
    const signature = signPaymentCallback(payload, DEV_PAYMENT_WEBHOOK_SECRET);

    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      orderNo: 'ORD1',
      status: OrderStatus.PAID,
      paymentProvider: PaymentProvider.MOCK,
      providerTradeNo: 'TX1',
    });

    await expect(service.handlePaymentCallback(dto, signature)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws when student does not exist on create', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.createOrder({ studentId: 'missing', title: 'x', amountCents: 100 }, 'key-student'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
