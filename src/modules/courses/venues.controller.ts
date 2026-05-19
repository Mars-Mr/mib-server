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
import { VenueResponseDto } from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateVenueDto } from './dto/venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@ApiTags('courses')
@ApiBearerAuth('jwt')
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
export class VenuesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '创建场地' })
  @ApiCreatedData(VenueResponseDto)
  create(@Body() dto: CreateVenueDto) {
    return this.coursesService.createVenue(dto);
  }

  @Get()
  @ApiOperation({ summary: '场地列表' })
  @ApiArrayOk(VenueResponseDto, '场地列表（数组）')
  findAll() {
    return this.coursesService.listVenues();
  }

  @ApiUuidParam('id', '场地 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '更新场地' })
  @ApiOkData(VenueResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.coursesService.updateVenue(id, dto);
  }

  @ApiUuidParam('id', '场地 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '删除场地' })
  @ApiDeleted()
  remove(@Param('id') id: string) {
    return this.coursesService.deleteVenue(id);
  }
}
