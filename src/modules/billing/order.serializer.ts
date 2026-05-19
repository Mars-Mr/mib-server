import type { Order, Student } from '@prisma/client';
import { formatAmountFromCents } from '../../common/money/money';

export type OrderWithStudent = Order & { student?: Student | null };

/** API shape: integer cents in DB + human-readable major unit string. */
export function serializeOrder(order: OrderWithStudent) {
  const { amountCents, currency, student, ...rest } = order;
  return {
    ...rest,
    amountCents,
    currency,
    /** Major currency amount for display (derived from `amountCents`). */
    amount: formatAmountFromCents(amountCents, currency),
    student,
  };
}

export function serializeOrders(orders: OrderWithStudent[]) {
  return orders.map(serializeOrder);
}
