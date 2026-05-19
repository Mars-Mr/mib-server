import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { isPrismaUniqueViolation } from '../../common/utils/prisma-errors';
import { Prisma, ScheduleStatus } from '@prisma/client';
import { auditOnCreate, auditOnDelete, auditOnUpdate } from '../../common/audit/audit-context';
import { DataScopeService } from '../../common/rbac/data-scope.service';
import { getAccessContext } from '../../common/rbac/request-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  LockOperationTimeoutError,
  RedisBusinessService,
} from '../../infrastructure/redis/redis-business.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateCourseTypeDto } from './dto/create-course-type.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateVenueDto } from './dto/venue.dto';
import {
  insertScheduleResourceLocks,
  releaseScheduleResourceLocks,
} from './schedule-resource-lock';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateCourseTypeDto } from './dto/update-course-type.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

/** Short TTL; renewed during txn. Correctness: ScheduleResourceLock unique + Serializable tx. */
const SCHEDULE_LOCK_TTL_SECONDS = 30;
const SCHEDULE_LOCK_OPERATION_TIMEOUT_MS = 28_000;
const SCHEDULE_LOCK_RENEW_INTERVAL_MS = 10_000;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisBiz: RedisBusinessService,
    private readonly dataScope: DataScopeService,
  ) {}

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
    if (!c) throw new NotFoundException('?????');
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
    try {
      return await this.prisma.classStudent.create({
        data: { classId, studentId },
        include: { student: true },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new ConflictException('????????');
      }
      throw error;
    }
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
    if (!(startsAt < endsAt)) throw new BadRequestException('??????');

    return this.withScheduleResourceRedisLocks(dto.coachId, dto.venueId, () =>
      this.prisma.$transaction(
        async tx => {
          const klass = await tx.class.findFirstOrThrow({
            where: { id: dto.classId },
            select: { tenantId: true },
          });
          const schedule = await tx.schedule.create({
            data: {
              tenantId: klass.tenantId ?? undefined,
              classId: dto.classId,
              venueId: dto.venueId,
              coachId: dto.coachId,
              startsAt,
              endsAt,
              lateGraceMinutes: dto.lateGraceMinutes ?? 15,
              status: dto.status ?? ScheduleStatus.SCHEDULED,
              ...auditOnCreate(),
            },
          });

          await this.applyResourceLocks(tx, schedule.id, dto.coachId, dto.venueId, startsAt, endsAt);

          return tx.schedule.findUniqueOrThrow({
            where: { id: schedule.id },
            include: { class: { include: { courseType: true } }, venue: true, coach: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async listSchedules(filters: { from?: string; to?: string; classId?: string; coachId?: string }) {
    const base: Prisma.ScheduleWhereInput = {
      status: { not: ScheduleStatus.CANCELLED },
    };
    if (filters.classId) base.classId = filters.classId;
    if (filters.coachId) base.coachId = filters.coachId;
    if (filters.from || filters.to) {
      base.startsAt = {};
      if (filters.from) base.startsAt.gte = new Date(filters.from);
      if (filters.to) base.startsAt.lte = new Date(filters.to);
    }

    const ctx = getAccessContext();
    if (ctx?.dataScope === 'coach_owned' && ctx.coachId && !filters.coachId) {
      base.coachId = ctx.coachId;
    }

    return this.prisma.schedule.findMany({
      where: this.dataScope.schedulesWhere(base),
      orderBy: { startsAt: 'asc' },
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
  }

  async getSchedule(id: string) {
    const s = await this.prisma.schedule.findFirst({
      where: this.dataScope.schedulesWhere({ id }),
      include: { class: { include: { courseType: true } }, venue: true, coach: true },
    });
    if (!s) throw new NotFoundException('?????');
    return s;
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    const current = await this.getSchedule(id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (!(startsAt < endsAt)) throw new BadRequestException('??????');

    const coachId = dto.coachId ?? current.coachId;
    const venueId = dto.venueId ?? current.venueId;

    return this.withScheduleResourceRedisLocks(coachId, venueId, () =>
      this.prisma.$transaction(
        async tx => {
          await releaseScheduleResourceLocks(tx, id);

          const schedule = await tx.schedule.update({
            where: { id },
            data: {
              classId: dto.classId,
              venueId: dto.venueId,
              coachId: dto.coachId,
              startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
              endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
              lateGraceMinutes: dto.lateGraceMinutes,
              status: dto.status,
              ...auditOnUpdate(),
            },
          });

          if (schedule.status !== ScheduleStatus.CANCELLED) {
            await this.applyResourceLocks(tx, id, coachId, venueId, startsAt, endsAt);
          }

          return tx.schedule.findUniqueOrThrow({
            where: { id },
            include: { class: { include: { courseType: true } }, venue: true, coach: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async deleteSchedule(id: string) {
    await this.getSchedule(id);
    await this.prisma.$transaction(async tx => {
      await releaseScheduleResourceLocks(tx, id);
      await tx.schedule.update({
        where: { id },
        data: { status: ScheduleStatus.CANCELLED, ...auditOnDelete() },
      });
    });
    return { ok: true };
  }

  private async applyResourceLocks(
    tx: Prisma.TransactionClient,
    scheduleId: string,
    coachId: string,
    venueId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    try {
      await insertScheduleResourceLocks(tx, scheduleId, coachId, venueId, startsAt, endsAt);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SCHEDULE_RESOURCE_CONFLICT') {
          throw new BadRequestException('coach or venue is already booked for this time slot');
        }
        if (error.message === 'SCHEDULE_EMPTY_TIME_RANGE') {
          throw new BadRequestException('invalid time range');
        }
      }
      throw error;
    }
  }

  private async withScheduleResourceRedisLocks<T>(
    coachId: string,
    venueId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.redisBiz.runWithBusinessLocks(
        [`schedule:coach:${coachId}`, `schedule:venue:${venueId}`],
        SCHEDULE_LOCK_TTL_SECONDS,
        fn,
        {
          operationTimeoutMs: SCHEDULE_LOCK_OPERATION_TIMEOUT_MS,
          renewIntervalMs: SCHEDULE_LOCK_RENEW_INTERVAL_MS,
          onBusy: () => {
            throw new ConflictException('????????????');
          },
        },
      );
    } catch (error) {
      if (error instanceof LockOperationTimeoutError) {
        throw new RequestTimeoutException('????????????');
      }
      throw error;
    }
  }

  private async ensureCourseType(id: string) {
    const t = await this.prisma.courseType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('???????');
    return t;
  }

  private async ensureVenue(id: string) {
    const v = await this.prisma.venue.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('?????');
    return v;
  }
}
