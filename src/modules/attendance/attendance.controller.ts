import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';

@ApiTags('attendance')
@ApiBearerAuth('jwt')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH, UserRole.STUDENT)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @AuditAction('签到')
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post('check-out')
  @AuditAction('签退')
  checkOut(@Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto);
  }

  @Post('leave-requests')
  @AuditAction('提交请假申请')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  leave(@Body() dto: CreateLeaveRequestDto) {
    return this.attendanceService.createLeaveRequest(dto);
  }

  @ApiUuidParam('scheduleId', '排课 ID')
  @Post('schedules/:scheduleId/qr-token')
  @AuditAction('发放排班签到二维码')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
  issueQr(@Param('scheduleId') scheduleId: string) {
    return this.attendanceService.issueQrToken(scheduleId);
  }
}
