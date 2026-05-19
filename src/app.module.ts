import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './common/health/health.controller';
import { LoggingModule } from './common/logger/logging.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CoachesModule } from './modules/coaches/coaches.module';
import { CoursesModule } from './modules/courses/courses.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { StudentsModule } from './modules/students/students.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    LoggingModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    StudentsModule,
    MembershipsModule,
    CoursesModule,
    CoachesModule,
    AttendanceModule,
    StatisticsModule,
    BillingModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
