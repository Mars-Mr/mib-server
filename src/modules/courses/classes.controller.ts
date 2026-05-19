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
import { ClassEnrollmentResponseDto, ClassResponseDto } from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@ApiTags('courses')
@ApiBearerAuth('jwt')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class ClassesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '创建班级' })
  @ApiCreatedData(ClassResponseDto)
  create(@Body() dto: CreateClassDto) {
    return this.coursesService.createClass(dto);
  }

  @Get()
  @ApiOperation({ summary: '班级列表' })
  @ApiArrayOk(ClassResponseDto, '班级列表（数组）')
  findAll() {
    return this.coursesService.listClasses();
  }

  @ApiUuidParam('id', '班级 ID')
  @Get(':id')
  @ApiOperation({ summary: '班级详情' })
  @ApiOkData(ClassResponseDto)
  findOne(@Param('id') id: string) {
    return this.coursesService.getClass(id);
  }

  @ApiUuidParam('id', '班级 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '更新班级' })
  @ApiOkData(ClassResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.coursesService.updateClass(id, dto);
  }

  @ApiUuidParam('id', '班级 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '删除班级' })
  @ApiDeleted()
  remove(@Param('id') id: string) {
    return this.coursesService.deleteClass(id);
  }

  @ApiUuidParam('id', '班级 ID')
  @Post(':id/students')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '学员入班' })
  @ApiCreatedData(ClassEnrollmentResponseDto)
  enroll(@Param('id') id: string, @Body() dto: EnrollStudentDto) {
    return this.coursesService.enrollStudent(id, dto.studentId);
  }

  @ApiUuidParam('id', '班级 ID')
  @ApiUuidParam('studentId', '学员 ID')
  @Delete(':id/students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '学员退班' })
  @ApiDeleted()
  unenroll(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.coursesService.unenrollStudent(id, studentId);
  }
}
