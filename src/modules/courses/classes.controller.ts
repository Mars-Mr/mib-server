import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { CoursesService } from './courses.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { UpdateClassDto } from './dto/update-class.dto';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.getClass(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.coursesService.updateClass(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.coursesService.deleteClass(id);
  }

  @Post(':id/students')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  enroll(@Param('id') id: string, @Body() dto: EnrollStudentDto) {
    return this.coursesService.enrollStudent(id, dto.studentId);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  unenroll(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.coursesService.unenrollStudent(id, studentId);
  }
}
