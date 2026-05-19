import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiOkData } from '../../common/swagger/api-response.decorators';
import {
  AttendanceStatisticsResponseDto,
  LessonStatisticsResponseDto,
  RevenueStatisticsResponseDto,
} from '../../common/swagger/dto/responses.dto';
import {
  AttendanceStatisticsQueryDto,
  LessonStatisticsQueryDto,
  StatisticsDateRangeQueryDto,
} from './dto/statistics-query.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth('jwt')
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('attendance')
  @ApiOperation({
    summary: '签到统计',
    description: '按时间范围、可选学员/班级筛选；返回各状态计数与到课率。',
  })
  @ApiOkData(AttendanceStatisticsResponseDto)
  attendance(@Query() query: AttendanceStatisticsQueryDto) {
    return this.statisticsService.attendanceSummary(query);
  }

  @Get('lessons')
  @ApiOperation({
    summary: '课时消耗统计',
    description: '统计区间内扣课总量（`LessonTransaction` 负 delta 合计）。',
  })
  @ApiOkData(LessonStatisticsResponseDto)
  lessons(@Query() query: LessonStatisticsQueryDto) {
    return this.statisticsService.lessonConsumption(query);
  }

  @Get('revenue')
  @ApiOperation({
    summary: '收入统计',
    description: '已支付订单数量与 `amountCents` 合计（分）；含展示用 `totalAmount` 字符串。',
  })
  @ApiOkData(RevenueStatisticsResponseDto)
  revenue(@Query() query: StatisticsDateRangeQueryDto) {
    return this.statisticsService.revenueSummary(query);
  }
}
