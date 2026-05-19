import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { CoursesService } from './courses.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleListQueryDto } from './dto/schedule-query.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('courses')
@ApiBearerAuth('jwt')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class SchedulesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateScheduleDto) {
    return this.coursesService.createSchedule(dto);
  }

  @Get()
  findAll(@Query() query: ScheduleListQueryDto) {
    return this.coursesService.listSchedules(query);
  }

  @ApiUuidParam('id', '排课 ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.getSchedule(id);
  }

  @ApiUuidParam('id', '排课 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.coursesService.updateSchedule(id, dto);
  }

  @ApiUuidParam('id', '排课 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.coursesService.deleteSchedule(id);
  }
}
