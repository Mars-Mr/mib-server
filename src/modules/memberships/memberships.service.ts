import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
        studentId: dto.studentId,
        title: dto.title,
        totalLessons: dto.totalLessons,
        remainingLessons: dto.remainingLessons,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        status: dto.status ?? MembershipStatus.ACTIVE,
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
      },
    });
  }

  async adjustLessons(id: string, dto: AdjustLessonsDto) {
    const card = await this.findOne(id);
    const next = card.remainingLessons + dto.delta;
    if (next < 0) throw new BadRequestException('剩余课时不足');

    return this.prisma.$transaction(async tx => {
      await tx.lessonTransaction.create({
        data: {
          membershipId: id,
          delta: dto.delta,
          reason: dto.reason,
          scheduleId: dto.scheduleId,
        },
      });
      return tx.membershipCard.update({
        where: { id },
        data: { remainingLessons: next },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
      });
    });
  }
}
