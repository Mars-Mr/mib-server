import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { CoursesService } from './courses.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

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
  findAll(@Query('from') from?: string, @Query('to') to?: string, @Query('classId') classId?: string, @Query('coachId') coachId?: string) {
    return this.coursesService.listSchedules({ from, to, classId, coachId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.getSchedule(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.coursesService.updateSchedule(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.coursesService.deleteSchedule(id);
  }
}
