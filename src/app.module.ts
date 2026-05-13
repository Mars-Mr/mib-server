import { Module } from '@nestjs/common';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CoachesModule } from './modules/coaches/coaches.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [AttendanceModule, AuthModule, StudentsModule, MembershipsModule, CoursesModule, CoachesModule, StatisticsModule],
})
export class AppModule {}
