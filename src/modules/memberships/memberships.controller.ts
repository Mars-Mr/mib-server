import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiIdempotent } from '../../common/idempotency/idempotent.decorator';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import {
  ApiArrayOk,
  ApiCreatedData,
  ApiOkData,
} from '../../common/swagger/api-response.decorators';
import {
  MembershipDetailResponseDto,
  MembershipResponseDto,
} from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  @ApiIdempotent('membership:create')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: '创建会员卡',
    description: '需 `Idempotency-Key`；创建时写入课时流水快照字段。',
  })
  @ApiCreatedData(MembershipDetailResponseDto)
  create(@Body() dto: CreateMembershipDto) {
    return this.membershipsService.create(dto);
  }

  @ApiUuidParam('studentId', '学员 ID')
  @Get('student/:studentId')
  @ApiOperation({ summary: '学员会员卡列表', description: '每张卡含最近 20 条课时流水。' })
  @ApiArrayOk(MembershipDetailResponseDto, '会员卡列表（数组）')
  listByStudent(@Param('studentId') studentId: string) {
    return this.membershipsService.findByStudent(studentId);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Get(':id')
  @ApiOperation({ summary: '会员卡详情', description: '含全部课时流水。' })
  @ApiOkData(MembershipDetailResponseDto)
  findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '更新会员卡', description: '有效期、状态等；不直接改剩余课时（请用 adjust-lessons）。' })
  @ApiOkData(MembershipResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    return this.membershipsService.update(id, dto);
  }

  @ApiUuidParam('id', '会员卡 ID')
  @Post(':id/adjust-lessons')
  @ApiIdempotent('membership:adjust-lessons')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: '调整剩余课时',
    description:
      '原子变更余额并写入 `LessonTransaction`（含 businessKey、前后余额、operatorId）。余额不足或版本冲突返回 400/409。',
  })
  @ApiOkData(MembershipDetailResponseDto, { description: '调整后的会员卡及最近流水' })
  adjust(@Param('id') id: string, @Body() dto: AdjustLessonsDto) {
    return this.membershipsService.adjustLessons(id, dto);
  }
}
