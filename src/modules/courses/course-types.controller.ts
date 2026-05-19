import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import {
  ApiArrayOk,
  ApiCreatedData,
  ApiDeleted,
  ApiOkData,
} from '../../common/swagger/api-response.decorators';
import { CourseTypeResponseDto } from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseTypeDto } from './dto/create-course-type.dto';
import { UpdateCourseTypeDto } from './dto/update-course-type.dto';

@ApiTags('courses')
@ApiBearerAuth('jwt')
@Controller('course-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class CourseTypesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '创建课程类型' })
  @ApiCreatedData(CourseTypeResponseDto)
  create(@Body() dto: CreateCourseTypeDto) {
    return this.coursesService.createCourseType(dto);
  }

  @Get()
  @ApiOperation({ summary: '课程类型列表' })
  @ApiArrayOk(CourseTypeResponseDto, '课程类型列表（数组）')
  findAll() {
    return this.coursesService.listCourseTypes();
  }

  @ApiUuidParam('id', '课程类型 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '更新课程类型' })
  @ApiOkData(CourseTypeResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateCourseTypeDto) {
    return this.coursesService.updateCourseType(id, dto);
  }

  @ApiUuidParam('id', '课程类型 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '删除课程类型' })
  @ApiDeleted()
  remove(@Param('id') id: string) {
    return this.coursesService.deleteCourseType(id);
  }
}
