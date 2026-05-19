import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/role/roles.guard';
import { Roles } from '../auth/role/roles.decorator';
import { CreateGroupDto, CreateTagDto, LinkGroupDto, LinkTagDto } from './dto/tag-group.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth('jwt')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('students')
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get('students')
  findAll() {
    return this.studentsService.findAll();
  }

  @ApiUuidParam('id', '学员 ID')
  @Get('students/:id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @ApiUuidParam('id', '学员 ID')
  @Patch('students/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @ApiUuidParam('id', '学员 ID')
  @Delete('students/:id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @ApiUuidParam('id', '学员 ID')
  @Post('students/:id/tags')
  addTag(@Param('id') id: string, @Body() dto: LinkTagDto) {
    return this.studentsService.addTag(id, dto.tagId);
  }

  @ApiUuidParam('id', '学员 ID')
  @ApiUuidParam('tagId', '标签 ID')
  @Delete('students/:id/tags/:tagId')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.studentsService.removeTag(id, tagId);
  }

  @ApiUuidParam('id', '学员 ID')
  @Post('students/:id/groups')
  addGroup(@Param('id') id: string, @Body() dto: LinkGroupDto) {
    return this.studentsService.addGroup(id, dto.groupId);
  }

  @ApiUuidParam('id', '学员 ID')
  @ApiUuidParam('groupId', '分组 ID')
  @Delete('students/:id/groups/:groupId')
  removeGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.studentsService.removeGroup(id, groupId);
  }

  @Get('tags')
  listTags() {
    return this.studentsService.listTags();
  }

  @Post('tags')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createTag(@Body() dto: CreateTagDto) {
    return this.studentsService.createTag(dto.name);
  }

  @Get('groups')
  listGroups() {
    return this.studentsService.listGroups();
  }

  @Post('groups')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createGroup(@Body() dto: CreateGroupDto) {
    return this.studentsService.createGroup(dto.name);
  }
}
