import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { AttendanceStatisticsQueryDto, LessonStatisticsQueryDto, StatisticsDateRangeQueryDto } from './dto/statistics-query.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth('jwt')
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('attendance')
  attendance(@Query() query: AttendanceStatisticsQueryDto) {
    return this.statisticsService.attendanceSummary(query);
  }

  @Get('lessons')
  lessons(@Query() query: LessonStatisticsQueryDto) {
    return this.statisticsService.lessonConsumption(query);
  }

  @Get('revenue')
  revenue(@Query() query: StatisticsDateRangeQueryDto) {
    return this.statisticsService.revenueSummary(query);
  }
}
