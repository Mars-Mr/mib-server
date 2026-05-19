import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { AdjustLessonsDto } from './dto/adjust-lessons.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('memberships')
@ApiBearerAuth('jwt')
@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateMembershipDto) {
    return this.membershipsService.create(dto);
  }

  @ApiUuidParam('studentId', '学员 ID')
  @Get('student/:studentId')
  listByStudent(@Param('studentId') studentId: string) {
    return this.membershipsService.findByStudent(studentId);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    return this.membershipsService.update(id, dto);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Post(':id/adjust-lessons')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  adjust(@Param('id') id: string, @Body() dto: AdjustLessonsDto) {
    return this.membershipsService.adjustLessons(id, dto);
  }
}
