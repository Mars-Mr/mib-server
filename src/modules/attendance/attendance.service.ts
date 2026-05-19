import { randomBytes } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceMethod, AttendanceStatus, LeaveStatus, MembershipStatus, ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { distanceMeters } from '../../common/utils/geo';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async issueQrToken(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('课次不存在');
    if (schedule.status === ScheduleStatus.CANCELLED) throw new BadRequestException('课次已取消');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(schedule.endsAt.getTime() + 30 * 60 * 1000);

    return this.prisma.scheduleQrToken.create({
      data: { scheduleId, token, expiresAt },
    });
  }

  async createLeaveRequest(dto: CreateLeaveRequestDto) {
    return this.prisma.leaveRequest.upsert({
      where: {
        studentId_scheduleId: { studentId: dto.studentId, scheduleId: dto.scheduleId },
      },
      create: {
        studentId: dto.studentId,
        scheduleId: dto.scheduleId,
        status: LeaveStatus.APPROVED,
      },
      update: { status: LeaveStatus.APPROVED },
    });
  }

  async checkIn(dto: CheckInDto) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: dto.scheduleId },
      include: {
        class: { include: { courseType: true } },
        venue: true,
      },
    });
    if (!schedule) throw new NotFoundException('课次不存在');
    if (schedule.status === ScheduleStatus.CANCELLED) throw new BadRequestException('课次已取消');

    const enrolled = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId: schedule.classId, studentId: dto.studentId } },
    });
    if (!enrolled) throw new ForbiddenException('学员未加入该班级');

    const leave = await this.prisma.leaveRequest.findUnique({
      where: { studentId_scheduleId: { studentId: dto.studentId, scheduleId: dto.scheduleId } },
    });
    if (leave?.status === LeaveStatus.APPROVED) {
      return this.upsertAttendance(dto.studentId, dto.scheduleId, {
        status: AttendanceStatus.LEAVE,
        method: dto.method,
        checkInAt: new Date(),
        checkInLat: dto.latitude,
        checkInLng: dto.longitude,
        skipDeduct: true,
      });
    }

    const now = new Date();
    if (now > schedule.endsAt) {
      return this.upsertAttendance(dto.studentId, dto.scheduleId, {
        status: AttendanceStatus.ABSENT,
        method: dto.method,
        checkInAt: null,
        checkInLat: dto.latitude,
        checkInLng: dto.longitude,
        skipDeduct: true,
      });
    }

    if (dto.method === AttendanceMethod.QR) {
      if (!dto.qrToken) throw new BadRequestException('缺少二维码令牌');
      const record = await this.prisma.scheduleQrToken.findFirst({
        where: { scheduleId: dto.scheduleId, token: dto.qrToken, expiresAt: { gt: now } },
      });
      if (!record) throw new BadRequestException('二维码无效或已过期');
    }

    if (dto.method === AttendanceMethod.GPS) {
      const v = schedule.venue;
      if (v.latitude == null || v.longitude == null || !v.geofenceRadiusM) {
        throw new BadRequestException('该场地未配置定位签到');
      }
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException('缺少定位坐标');
      }
      const d = distanceMeters(dto.latitude, dto.longitude, v.latitude, v.longitude);
      if (d > v.geofenceRadiusM) throw new BadRequestException('不在允许签到范围内');
    }

    const graceEnd = new Date(schedule.startsAt.getTime() + schedule.lateGraceMinutes * 60 * 1000);
    const status = now > graceEnd ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    const deductAmount = schedule.class.courseType.defaultLessonDeduct;

    return this.upsertAttendance(dto.studentId, dto.scheduleId, {
      status,
      method: dto.method,
      checkInAt: now,
      checkInLat: dto.latitude,
      checkInLng: dto.longitude,
      skipDeduct: false,
      deductAmount,
    });
  }

  async checkOut(dto: CheckOutDto) {
    const rec = await this.prisma.attendanceRecord.findUnique({
      where: { studentId_scheduleId: { studentId: dto.studentId, scheduleId: dto.scheduleId } },
    });
    if (!rec) throw new NotFoundException('无签到记录');
    return this.prisma.attendanceRecord.update({
      where: { id: rec.id },
      data: { checkOutAt: new Date() },
    });
  }

  private async upsertAttendance(
    studentId: string,
    scheduleId: string,
    params: {
      status: AttendanceStatus;
      method: AttendanceMethod;
      checkInAt: Date | null;
      checkInLat?: number;
      checkInLng?: number;
      skipDeduct: boolean;
      deductAmount?: number;
    },
  ) {
    const { status, method, checkInAt, checkInLat, checkInLng, skipDeduct, deductAmount } = params;

    return this.prisma.$transaction(async tx => {
      const saved = await tx.attendanceRecord.upsert({
        where: { studentId_scheduleId: { studentId, scheduleId } },
        create: {
          studentId,
          scheduleId,
          status,
          method,
          checkInAt,
          checkInLat,
          checkInLng,
        },
        update: {
          status,
          method,
          ...(checkInAt !== undefined ? { checkInAt } : {}),
          checkInLat,
          checkInLng,
        },
      });

      let deducted = false;
      if (!skipDeduct && deductAmount && deductAmount > 0) {
        const already = await tx.lessonTransaction.findFirst({
          where: {
            scheduleId,
            membership: { studentId },
          },
        });
        if (!already) {
          const card = await tx.membershipCard.findFirst({
            where: {
              studentId,
              status: MembershipStatus.ACTIVE,
              validFrom: { lte: new Date() },
              validTo: { gte: new Date() },
              remainingLessons: { gte: deductAmount },
            },
            orderBy: { validTo: 'asc' },
          });
          if (card) {
            await tx.lessonTransaction.create({
              data: {
                membershipId: card.id,
                delta: -deductAmount,
                reason: 'CLASS_CHECK_IN',
                scheduleId,
              },
            });
            await tx.membershipCard.update({
              where: { id: card.id },
              data: { remainingLessons: { decrement: deductAmount } },
            });
            deducted = true;
          }
        }
      }

      return { attendance: saved, deducted };
    });
  }
}
