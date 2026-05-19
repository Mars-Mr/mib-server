import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async attendanceSummary(params: { from?: string; to?: string; studentId?: string; classId?: string }) {
    const scheduleWhere: Record<string, unknown> = {};
    if (params.from || params.to) {
      scheduleWhere.startsAt = {};
      if (params.from) (scheduleWhere.startsAt as { gte?: Date; lte?: Date }).gte = new Date(params.from);
      if (params.to) (scheduleWhere.startsAt as { gte?: Date; lte?: Date }).lte = new Date(params.to);
    }
    if (params.classId) scheduleWhere.classId = params.classId;

    const where: Record<string, unknown> = {};
    if (params.studentId) where.studentId = params.studentId;
    if (Object.keys(scheduleWhere).length) where.schedule = scheduleWhere;

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: { schedule: { include: { class: true } } },
    });

    const byStatus = { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0 };
    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }
    const total = records.length;
    const attended = byStatus.PRESENT + byStatus.LATE;
    return {
      totalRecords: total,
      byStatus,
      attendanceRate: total ? attended / total : 0,
    };
  }

  async lessonConsumption(params: { from?: string; to?: string; studentId?: string }) {
    const where: Record<string, unknown> = { delta: { lt: 0 } };
    if (params.studentId) {
      where.membership = { studentId: params.studentId };
    }
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) (where.createdAt as { gte?: Date; lte?: Date }).gte = new Date(params.from);
      if (params.to) (where.createdAt as { gte?: Date; lte?: Date }).lte = new Date(params.to);
    }

    const agg = await this.prisma.lessonTransaction.aggregate({
      where,
      _sum: { delta: true },
    });
    return { totalDeductedLessons: -(agg._sum.delta ?? 0) };
  }

  async revenueSummary(params: { from?: string; to?: string }) {
    const where: Record<string, unknown> = {};
    if (params.from || params.to) {
      where.paidAt = {};
      if (params.from) (where.paidAt as { gte?: Date; lte?: Date }).gte = new Date(params.from);
      if (params.to) (where.paidAt as { gte?: Date; lte?: Date }).lte = new Date(params.to);
    }
    const agg = await this.prisma.order.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });
    return { orderCount: agg._count, totalAmount: agg._sum.amount ?? 0 };
  }
}
