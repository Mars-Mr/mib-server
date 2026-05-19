import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  classDataScopeWhere,
  coachDataScopeWhere,
  scheduleDataScopeWhere,
  studentDataScopeWhere,
  mergeWhere,
} from './data-scope.filters';
import { getAccessContext } from './request-context';

@Injectable()
export class DataScopeService {
  private ctx() {
    return getAccessContext();
  }

  studentsWhere(base?: Prisma.StudentWhereInput): Prisma.StudentWhereInput {
    return mergeWhere(base, studentDataScopeWhere(this.ctx()));
  }

  schedulesWhere(base?: Prisma.ScheduleWhereInput): Prisma.ScheduleWhereInput {
    return mergeWhere(base, scheduleDataScopeWhere(this.ctx()));
  }

  coachesWhere(base?: Prisma.CoachWhereInput): Prisma.CoachWhereInput {
    return mergeWhere(base, coachDataScopeWhere(this.ctx()));
  }

  classesWhere(base?: Prisma.ClassWhereInput): Prisma.ClassWhereInput {
    return mergeWhere(base, classDataScopeWhere(this.ctx()));
  }

  async assertStudentVisible(studentId: string, prisma: { student: { findFirst: (args: object) => Promise<unknown> } }) {
    const row = await prisma.student.findFirst({
      where: this.studentsWhere({ id: studentId }),
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('无权访问该学员');
  }

  async assertScheduleVisible(
    scheduleId: string,
    prisma: { schedule: { findFirst: (args: object) => Promise<unknown> } },
  ) {
    const row = await prisma.schedule.findFirst({
      where: this.schedulesWhere({ id: scheduleId }),
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('无权访问该排课');
  }
}
