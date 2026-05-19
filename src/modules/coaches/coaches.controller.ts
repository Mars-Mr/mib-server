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
import { CoachResponseDto } from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@ApiTags('coaches')
@ApiBearerAuth('jwt')
@Controller('coaches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Post()
  @ApiOperation({ summary: '创建教练' })
  @ApiCreatedData(CoachResponseDto)
  create(@Body() dto: CreateCoachDto) {
    return this.coachesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: '教练列表',
    description: '按数据权限过滤；当前返回数组（非分页包装）。',
  })
  @ApiArrayOk(CoachResponseDto, '教练列表（数组）')
  findAll() {
    return this.coachesService.findAll();
  }

  @ApiUuidParam('id', '教练 ID')
  @Get(':id')
  @ApiOperation({ summary: '教练详情' })
  @ApiOkData(CoachResponseDto)
  findOne(@Param('id') id: string) {
    return this.coachesService.findOne(id);
  }

  @ApiUuidParam('id', '教练 ID')
  @Patch(':id')
  @ApiOperation({ summary: '更新教练' })
  @ApiOkData(CoachResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateCoachDto) {
    return this.coachesService.update(id, dto);
  }

  @ApiUuidParam('id', '教练 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '删除教练' })
  @ApiDeleted()
  remove(@Param('id') id: string) {
    return this.coachesService.remove(id);
  }
}
