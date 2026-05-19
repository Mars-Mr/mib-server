import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiIdempotent } from '../../common/idempotency/idempotent.decorator';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import {
  ApiArrayOk,
  ApiCreatedData,
  ApiDeleted,
  ApiOkData,
} from '../../common/swagger/api-response.decorators';
import { ScheduleResponseDto } from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permission } from '../../common/rbac/permission.codes';
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
  @ApiIdempotent('schedule:create')
  @RequirePermissions(Permission.SCHEDULES_WRITE)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: '创建排课',
    description: '校验教练/场地时间冲突；需 `Idempotency-Key` 与 `schedules:write` 权限。',
  })
  @ApiCreatedData(ScheduleResponseDto)
  create(@Body() dto: CreateScheduleDto) {
    return this.coursesService.createSchedule(dto);
  }

  @Get()
  @RequirePermissions(Permission.SCHEDULES_READ)
  @ApiOperation({
    summary: '排课列表',
    description: '支持 `from`/`to`/`classId`/`coachId` 及分页参数；按数据权限过滤。',
  })
  @ApiArrayOk(ScheduleResponseDto, '排课列表（数组）')
  findAll(@Query() query: ScheduleListQueryDto) {
    return this.coursesService.listSchedules(query);
  }

  @ApiUuidParam('id', '排课 ID')
  @Get(':id')
  @ApiOperation({ summary: '排课详情' })
  @ApiOkData(ScheduleResponseDto)
  findOne(@Param('id') id: string) {
    return this.coursesService.getSchedule(id);
  }

  @ApiUuidParam('id', '排课 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '更新排课' })
  @ApiOkData(ScheduleResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.coursesService.updateSchedule(id, dto);
  }

  @ApiUuidParam('id', '排课 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '取消排课', description: '逻辑取消（状态 CANCELLED），非物理删除。' })
  @ApiDeleted('排课已取消')
  remove(@Param('id') id: string) {
    return this.coursesService.deleteSchedule(id);
  }
}
