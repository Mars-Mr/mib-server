import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import {
  ApiArrayOk,
  ApiCreatedData,
  ApiDeleted,
  ApiOkData,
} from '../../common/swagger/api-response.decorators';
import {
  GroupResponseDto,
  StudentResponseDto,
  TagResponseDto,
} from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateGroupDto, CreateTagDto, LinkGroupDto, LinkTagDto } from './dto/tag-group.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentsListQueryDto } from './dto/students-list-query.dto';
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
  @ApiOperation({ summary: '创建学员' })
  @ApiCreatedData(StudentResponseDto)
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get('students')
  @ApiOperation({
    summary: '学员列表',
    description: '按创建时间倒序；`page`/`pageSize` 查询参数已预留，当前返回全部可见学员数组。',
  })
  @ApiArrayOk(StudentResponseDto, '学员列表（数组）')
  findAll(@Query() _query: StudentsListQueryDto) {
    return this.studentsService.findAll();
  }

  @ApiUuidParam('id', '学员 ID')
  @Get('students/:id')
  @ApiOperation({ summary: '学员详情' })
  @ApiOkData(StudentResponseDto)
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @ApiUuidParam('id', '学员 ID')
  @Patch('students/:id')
  @ApiOperation({ summary: '更新学员' })
  @ApiOkData(StudentResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @ApiUuidParam('id', '学员 ID')
  @Delete('students/:id')
  @ApiOperation({ summary: '删除学员' })
  @ApiDeleted()
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @ApiUuidParam('id', '学员 ID')
  @Post('students/:id/tags')
  @ApiOperation({ summary: '为学员添加标签' })
  @ApiOkData(StudentResponseDto)
  addTag(@Param('id') id: string, @Body() dto: LinkTagDto) {
    return this.studentsService.addTag(id, dto.tagId);
  }

  @ApiUuidParam('id', '学员 ID')
  @ApiUuidParam('tagId', '标签 ID')
  @Delete('students/:id/tags/:tagId')
  @ApiOperation({ summary: '移除学员标签' })
  @ApiDeleted()
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.studentsService.removeTag(id, tagId);
  }

  @ApiUuidParam('id', '学员 ID')
  @Post('students/:id/groups')
  @ApiOperation({ summary: '将学员加入分组' })
  @ApiOkData(StudentResponseDto)
  addGroup(@Param('id') id: string, @Body() dto: LinkGroupDto) {
    return this.studentsService.addGroup(id, dto.groupId);
  }

  @ApiUuidParam('id', '学员 ID')
  @ApiUuidParam('groupId', '分组 ID')
  @Delete('students/:id/groups/:groupId')
  @ApiOperation({ summary: '将学员移出分组' })
  @ApiDeleted()
  removeGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.studentsService.removeGroup(id, groupId);
  }

  @Get('tags')
  @ApiOperation({ summary: '标签列表' })
  @ApiArrayOk(TagResponseDto, '全部标签')
  listTags() {
    return this.studentsService.listTags();
  }

  @Post('tags')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '创建标签' })
  @ApiCreatedData(TagResponseDto)
  createTag(@Body() dto: CreateTagDto) {
    return this.studentsService.createTag(dto.name);
  }

  @Get('groups')
  @ApiOperation({ summary: '分组列表' })
  @ApiArrayOk(GroupResponseDto, '全部分组')
  listGroups() {
    return this.studentsService.listGroups();
  }

  @Post('groups')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '创建分组' })
  @ApiCreatedData(GroupResponseDto)
  createGroup(@Body() dto: CreateGroupDto) {
    return this.studentsService.createGroup(dto.name);
  }
}
