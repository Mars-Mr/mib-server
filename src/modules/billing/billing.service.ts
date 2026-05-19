import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import type { EnvConfig } from '../../common/config/env.types';
import { isPrismaUniqueViolation } from '../../common/utils/prisma-errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { runWithoutTenantScope } from '../../infrastructure/prisma/tenant/tenant-context';
import { generateOrderNo } from './billing-order-no';
import {
  buildPaymentCallbackSignPayload,
  verifyPaymentCallbackSignature,
} from './billing-payment-signature';
import { auditOnCreate, auditOnUpdate } from '../../common/audit/audit-context';
import { DEFAULT_CURRENCY } from '../../common/money/money';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentCallbackDto, PaymentCallbackEvent } from './dto/payment-callback.dto';
import { serializeOrder, serializeOrders } from './order.serializer';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  async createOrder(dto: CreateOrderDto, idempotencyKey: string) {
    let tenantId: string | undefined;
    if (dto.studentId) {
      const student = await this.prisma.student.findFirst({
        where: { id: dto.studentId },
        select: { id: true, tenantId: true },
      });
      if (!student) throw new NotFoundException('学员不存在');
      tenantId = student.tenantId ?? undefined;
    }

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { student: true },
    });
    if (existing) return serializeOrder(existing);

    try {
      const created = await this.prisma.order.create({
        data: {
          tenantId,
          orderNo: generateOrderNo(),
          studentId: dto.studentId,
          title: dto.title,
          amountCents: dto.amountCents,
          currency: dto.currency ?? DEFAULT_CURRENCY,
          status: OrderStatus.PENDING,
          idempotencyKey,
          ...auditOnCreate(),
        },
        include: { student: true },
      });
      return serializeOrder(created);
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        const winner = await this.prisma.order.findUnique({
          where: { idempotencyKey },
          include: { student: true },
        });
        if (winner) return serializeOrder(winner);
      }
      throw error;
    }
  }

  async findAll() {
    const rows = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { student: true },
    });
    return serializeOrders(rows);
  }

  async findByOrderNo(orderNo: string) {
    const row = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { student: true },
    });
    return row ? serializeOrder(row) : null;
  }

  async handlePaymentCallback(dto: PaymentCallbackDto, signature: string | undefined) {
    this.assertPaymentSignature(dto, signature);

    return runWithoutTenantScope(async () => {
      if (dto.event === PaymentCallbackEvent.PAID) {
        return this.markOrderPaid(dto);
      }
      if (dto.event === PaymentCallbackEvent.REFUNDED) {
        return this.markOrderRefunded(dto);
      }
      throw new BadRequestException('Unsupported payment callback event');
    });
  }

  private assertPaymentSignature(dto: PaymentCallbackDto, signature: string | undefined): void {
    const payload = buildPaymentCallbackSignPayload(dto);
    const secret = this.env.PAYMENT_WEBHOOK_SECRET;
    if (!verifyPaymentCallbackSignature(payload, signature, secret)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
  }

  private async markOrderPaid(dto: PaymentCallbackDto) {
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { orderNo: dto.orderNo } });
      if (!order) throw new NotFoundException('订单不存在');

      if (this.isSamePaidCallback(order, dto)) {
        return serializeOrder(await this.includeStudent(tx, order.id));
      }

      if (order.status === OrderStatus.PAID) {
        throw new ConflictException('订单已支付');
      }
      if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('订单状态不允许支付');
      }

      try {
        const updated = await tx.order.updateMany({
          where: { orderNo: dto.orderNo, status: OrderStatus.PENDING },
          data: {
            status: OrderStatus.PAID,
            paymentProvider: dto.provider,
            providerTradeNo: dto.providerTradeNo,
            paidAt,
            ...auditOnUpdate(),
          },
        });

        if (updated.count === 1) {
          const paid = await tx.order.findUniqueOrThrow({
            where: { orderNo: dto.orderNo },
            include: { student: true },
          });
          return serializeOrder(paid);
        }
      } catch (error) {
        if (isPrismaUniqueViolation(error)) {
          return this.resolvePaidCallbackAfterUniqueConflict(tx, dto);
        }
        throw error;
      }

      return this.resolvePaidCallbackAfterRace(tx, dto);
    });
  }

  private async markOrderRefunded(dto: PaymentCallbackDto) {
    const refundedAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { orderNo: dto.orderNo } });
      if (!order) throw new NotFoundException('订单不存在');

      if (order.status === OrderStatus.REFUNDED) {
        if (this.isSameRefundCallback(order, dto)) {
          const row = await tx.order.findUniqueOrThrow({
            where: { orderNo: dto.orderNo },
            include: { student: true },
          });
          return serializeOrder(row);
        }
        throw new ConflictException('订单已退款');
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('仅已支付订单可退款');
      }

      if (
        order.paymentProvider !== dto.provider ||
        (order.providerTradeNo && order.providerTradeNo !== dto.providerTradeNo)
      ) {
        throw new ConflictException('退款回调与支付交易不匹配');
      }

      const updated = await tx.order.updateMany({
        where: { orderNo: dto.orderNo, status: OrderStatus.PAID },
        data: {
          status: OrderStatus.REFUNDED,
          refundedAt,
          ...auditOnUpdate(),
        },
      });

      if (updated.count === 1) {
        const row = await tx.order.findUniqueOrThrow({
          where: { orderNo: dto.orderNo },
          include: { student: true },
        });
        return serializeOrder(row);
      }

      const again = await tx.order.findUnique({ where: { orderNo: dto.orderNo } });
      if (again && this.isSameRefundCallback(again, dto)) {
        const row = await tx.order.findUniqueOrThrow({
          where: { orderNo: dto.orderNo },
          include: { student: true },
        });
        return serializeOrder(row);
      }

      throw new ConflictException('退款处理冲突，请重试');
    });
  }

  private isSamePaidCallback(
    order: { status: OrderStatus; paymentProvider: string | null; providerTradeNo: string | null },
    dto: PaymentCallbackDto,
  ): boolean {
    return (
      order.status === OrderStatus.PAID &&
      order.paymentProvider === dto.provider &&
      order.providerTradeNo === dto.providerTradeNo
    );
  }

  private isSameRefundCallback(
    order: { status: OrderStatus; paymentProvider: string | null; providerTradeNo: string | null },
    dto: PaymentCallbackDto,
  ): boolean {
    return (
      order.status === OrderStatus.REFUNDED &&
      order.paymentProvider === dto.provider &&
      order.providerTradeNo === dto.providerTradeNo
    );
  }

  private async resolvePaidCallbackAfterUniqueConflict(
    tx: Prisma.TransactionClient,
    dto: PaymentCallbackDto,
  ) {
    const byTrade = await tx.order.findFirst({
      where: {
        paymentProvider: dto.provider,
        providerTradeNo: dto.providerTradeNo,
      },
    });
    if (byTrade?.orderNo === dto.orderNo) {
      const row = await tx.order.findUniqueOrThrow({
        where: { orderNo: dto.orderNo },
        include: { student: true },
      });
      return serializeOrder(row);
    }
    throw new ConflictException('支付交易号已被其他订单使用');
  }

  private async resolvePaidCallbackAfterRace(tx: Prisma.TransactionClient, dto: PaymentCallbackDto) {
    const again = await tx.order.findUnique({ where: { orderNo: dto.orderNo } });
    if (again && this.isSamePaidCallback(again, dto)) {
      const row = await tx.order.findUniqueOrThrow({
        where: { orderNo: dto.orderNo },
        include: { student: true },
      });
      return serializeOrder(row);
    }
    throw new ConflictException('支付处理冲突，请重试');
  }

  private includeStudent(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { student: true },
    });
  }
}
