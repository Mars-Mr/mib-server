import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
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
  create(@Body() dto: CreateVenueDto) {
    return this.coursesService.createVenue(dto);
  }

  @Get()
  findAll() {
    return this.coursesService.listVenues();
  }

  @ApiUuidParam('id', '场地 ID')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.coursesService.updateVenue(id, dto);
  }

  @ApiUuidParam('id', '场地 ID')
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.coursesService.deleteVenue(id);
  }
}
