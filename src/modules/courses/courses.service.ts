import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateCourseTypeDto } from './dto/create-course-type.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateVenueDto } from './dto/venue.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateCourseTypeDto } from './dto/update-course-type.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Course types ---
  createCourseType(dto: CreateCourseTypeDto) {
    return this.prisma.courseType.create({
      data: {
        kind: dto.kind,
        name: dto.name,
        defaultLessonDeduct: dto.defaultLessonDeduct ?? 1,
      },
    });
  }

  listCourseTypes() {
    return this.prisma.courseType.findMany({ orderBy: { name: 'asc' } });
  }

  async updateCourseType(id: string, dto: UpdateCourseTypeDto) {
    await this.ensureCourseType(id);
    return this.prisma.courseType.update({ where: { id }, data: dto });
  }

  async deleteCourseType(id: string) {
    await this.ensureCourseType(id);
    await this.prisma.courseType.delete({ where: { id } });
    return { ok: true };
  }

  // --- Venues ---
  createVenue(dto: CreateVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  listVenues() {
    return this.prisma.venue.findMany({ orderBy: { name: 'asc' } });
  }

  async updateVenue(id: string, dto: UpdateVenueDto) {
    await this.ensureVenue(id);
    return this.prisma.venue.update({ where: { id }, data: dto });
  }

  async deleteVenue(id: string) {
    await this.ensureVenue(id);
    await this.prisma.venue.delete({ where: { id } });
    return { ok: true };
  }

  // --- Classes ---
  createClass(dto: CreateClassDto) {
    return this.prisma.class.create({
      data: {
        courseTypeId: dto.courseTypeId,
        name: dto.name,
        coachId: dto.coachId,
        maxStudents: dto.maxStudents,
      },
      include: { courseType: true, coach: true },
    });
  }

  listClasses() {
    return this.prisma.class.findMany({
      orderBy: { createdAt: 'desc' },
      include: { courseType: true, coach: true, _count: { select: { students: true } } },
    });
  }

  async getClass(id: string) {
    const c = await this.prisma.class.findUnique({
      where: { id },
      include: { courseType: true, coach: true, students: { include: { student: true } } },
    });
    if (!c) throw new NotFoundException('班级不存在');
    return c;
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    await this.getClass(id);
    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: { courseType: true, coach: true },
    });
  }

  async deleteClass(id: string) {
    await this.getClass(id);
    await this.prisma.class.delete({ where: { id } });
    return { ok: true };
  }

  async enrollStudent(classId: string, studentId: string) {
    await this.getClass(classId);
    return this.prisma.classStudent.create({
      data: { classId, studentId },
      include: { student: true },
    });
  }

  async unenrollStudent(classId: string, studentId: string) {
    await this.prisma.classStudent.delete({
      where: { classId_studentId: { classId, studentId } },
    });
    return { ok: true };
  }

  // --- Schedules ---
  async createSchedule(dto: CreateScheduleDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(startsAt < endsAt)) throw new BadRequestException('时间区间无效');

    await this.assertNoScheduleConflict({
      coachId: dto.coachId,
      venueId: dto.venueId,
      startsAt,
      endsAt,
    });

    return this.prisma.schedule.create({
      data: {
        classId: dto.classId,
        venueId: dto.venueId,
        coachId: dto.coachId,
        startsAt,
        endsAt,
        lateGraceMinutes: dto.lateGraceMinutes ?? 15,
        status: dto.status ?? ScheduleStatus.SCHEDULED,
      },
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
  }

  async listSchedules(filters: { from?: string; to?: string; classId?: string; coachId?: string }) {
    const where: Record<string, unknown> = {
      status: { not: ScheduleStatus.CANCELLED },
    };
    if (filters.classId) where.classId = filters.classId;
    if (filters.coachId) where.coachId = filters.coachId;
    if (filters.from || filters.to) {
      where.startsAt = {};
      if (filters.from) (where.startsAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.startsAt as Record<string, Date>).lte = new Date(filters.to);
    }
    return this.prisma.schedule.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
  }

  async getSchedule(id: string) {
    const s = await this.prisma.schedule.findUnique({
      where: { id },
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
    if (!s) throw new NotFoundException('课次不存在');
    return s;
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    const current = await this.getSchedule(id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (!(startsAt < endsAt)) throw new BadRequestException('时间区间无效');

    const coachId = dto.coachId ?? current.coachId;
    const venueId = dto.venueId ?? current.venueId;

    await this.assertNoScheduleConflict({
      coachId,
      venueId,
      startsAt,
      endsAt,
      excludeScheduleId: id,
    });

    return this.prisma.schedule.update({
      where: { id },
      data: {
        classId: dto.classId,
        venueId: dto.venueId,
        coachId: dto.coachId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        lateGraceMinutes: dto.lateGraceMinutes,
        status: dto.status,
      },
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
  }

  async deleteSchedule(id: string) {
    await this.getSchedule(id);
    await this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });
    return { ok: true };
  }

  private async assertNoScheduleConflict(params: { coachId: string; venueId: string; startsAt: Date; endsAt: Date; excludeScheduleId?: string }) {
    const { coachId, venueId, startsAt, endsAt, excludeScheduleId } = params;
    const base = { status: { not: ScheduleStatus.CANCELLED } as const };

    const coachClash = await this.prisma.schedule.findFirst({
      where: {
        ...base,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        coachId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (coachClash) throw new BadRequestException('教练在该时段已有排课');

    const venueClash = await this.prisma.schedule.findFirst({
      where: {
        ...base,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        venueId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (venueClash) throw new BadRequestException('场地在该时段已被占用');
  }

  private async ensureCourseType(id: string) {
    const t = await this.prisma.courseType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('课程类型不存在');
    return t;
  }

  private async ensureVenue(id: string) {
    const v = await this.prisma.venue.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('场地不存在');
    return v;
  }
}
