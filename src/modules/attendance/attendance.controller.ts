import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { ApiIdempotent } from '../../common/idempotency/idempotent.decorator';
import { ApiUuidParam } from '../../common/swagger/api-param.decorators';
import { ApiCreatedData, ApiOkData } from '../../common/swagger/api-response.decorators';
import {
  AttendanceRecordResponseDto,
  CheckInResponseDto,
  LeaveRequestResponseDto,
  QrTokenResponseDto,
} from '../../common/swagger/dto/responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  @ApiIdempotent('attendance:check-in')
  @ApiOperation({
    summary: '签到',
    description:
      '支持手动/扫码/GPS；已批准请假不扣课。需 `Idempotency-Key`；课时扣减依赖 `LessonTransaction.businessKey` 幂等。',
  })
  @ApiOkData(CheckInResponseDto)
  @AuditAction('签到')
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post('check-out')
  @ApiOperation({ summary: '签退' })
  @ApiOkData(AttendanceRecordResponseDto)
  @AuditAction('签退')
  checkOut(@Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto);
  }

  @Post('leave-requests')
  @ApiOperation({ summary: '提交请假', description: '默认批准；该排课签到将不再扣课。' })
  @ApiCreatedData(LeaveRequestResponseDto)
  @AuditAction('提交请假申请')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  leave(@Body() dto: CreateLeaveRequestDto) {
    return this.attendanceService.createLeaveRequest(dto);
  }

  @ApiUuidParam('scheduleId', '排课 ID')
  @Post('schedules/:scheduleId/qr-token')
  @ApiOperation({ summary: '签发签到二维码 Token', description: '教练/教务为某次排课生成短时有效 token。' })
  @ApiCreatedData(QrTokenResponseDto)
  @AuditAction('签发签到二维码')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.COACH)
  issueQr(@Param('scheduleId') scheduleId: string) {
    return this.attendanceService.issueQrToken(scheduleId);
  }
}
