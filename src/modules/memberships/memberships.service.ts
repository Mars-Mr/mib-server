import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../../common/audit/audit-context';
import {
  buildAdjustBusinessKey,
  lessonTransactionCreateData,
} from '../../common/prisma/lesson-transaction';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { applyMembershipLessonDelta } from './memberships-lesson-adjust';
import { AdjustLessonsDto } from './dto/adjust-lessons.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMembershipDto) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('学员不存在');

    return this.prisma.membershipCard.create({
      data: {
        tenantId: student.tenantId ?? undefined,
        studentId: dto.studentId,
        title: dto.title,
        totalLessons: dto.totalLessons,
        remainingLessons: dto.remainingLessons,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        status: dto.status ?? MembershipStatus.ACTIVE,
        ...auditOnCreate(),
      },
      include: { transactions: true },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.membershipCard.findMany({
      where: { studentId },
      orderBy: { validTo: 'asc' },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async findOne(id: string) {
    const m = await this.prisma.membershipCard.findUnique({
      where: { id },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!m) throw new NotFoundException('会员卡不存在');
    return m;
  }

  async update(id: string, dto: UpdateMembershipDto) {
    await this.findOne(id);
    return this.prisma.membershipCard.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        ...auditOnUpdate(),
      },
    });
  }

  async adjustLessons(id: string, dto: AdjustLessonsDto) {
    if (dto.delta === 0) {
      throw new BadRequestException('调整量不能为 0');
    }

    return this.prisma.$transaction(async tx => {
      const card = await tx.membershipCard.findUnique({
        where: { id },
        select: { id: true, version: true, studentId: true, remainingLessons: true },
      });
      if (!card) throw new NotFoundException('会员卡不存在');

      const beforeRemaining = card.remainingLessons;
      const adjusted = await applyMembershipLessonDelta(tx, id, card.version, dto.delta);
      if (adjusted.ok === false) {
        if (adjusted.reason === 'insufficient') {
          throw new BadRequestException('剩余课时不足');
        }
        throw new ConflictException('会员卡已被其他人更新，请刷新后重试');
      }

      const afterRemaining = beforeRemaining + dto.delta;
      await tx.lessonTransaction.create({
        data: lessonTransactionCreateData({
          membershipId: id,
          studentId: card.studentId,
          delta: dto.delta,
          reason: dto.reason,
          scheduleId: dto.scheduleId,
          businessKey: buildAdjustBusinessKey(id),
          beforeRemaining,
          afterRemaining,
          metadata: {
            source: 'manual_adjust',
            scheduleId: dto.scheduleId ?? null,
          },
        }),
      });

      return tx.membershipCard.findUniqueOrThrow({
        where: { id },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
      });
    });
  }
}
