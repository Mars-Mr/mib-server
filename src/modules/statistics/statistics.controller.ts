import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('attendance')
  attendance(@Query('from') from?: string, @Query('to') to?: string, @Query('studentId') studentId?: string, @Query('classId') classId?: string) {
    return this.statisticsService.attendanceSummary({ from, to, studentId, classId });
  }

  @Get('lessons')
  lessons(@Query('from') from?: string, @Query('to') to?: string, @Query('studentId') studentId?: string) {
    return this.statisticsService.lessonConsumption({ from, to, studentId });
  }

  @Get('revenue')
  revenue(@Query('from') from?: string, @Query('to') to?: string) {
    return this.statisticsService.revenueSummary({ from, to });
  }
}
