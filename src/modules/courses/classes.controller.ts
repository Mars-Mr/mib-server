import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
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
  create(@Body() dto: CreateClassDto) {
    return this.coursesService.createClass(dto);
  }

  @Get()
  findAll() {
    return this.coursesService.listClasses();
  }

  @ApiUuidParam('id', '班级 ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.getClass(id);
  }

  @ApiUuidParam('id', '班级 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.coursesService.updateClass(id, dto);
  }

  @ApiUuidParam('id', '班级 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.coursesService.deleteClass(id);
  }

  @ApiUuidParam('id', '班级 ID')
  @Post(':id/students')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  enroll(@Param('id') id: string, @Body() dto: EnrollStudentDto) {
    return this.coursesService.enrollStudent(id, dto.studentId);
  }

  @ApiUuidParam('id', '班级 ID')
  @ApiUuidParam('studentId', '学员 ID')
  @Delete(':id/students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  unenroll(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.coursesService.unenrollStudent(id, studentId);
  }
}
