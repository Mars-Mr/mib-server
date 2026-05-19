import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttendanceMethod,
  AttendanceStatus,
  CourseKind,
  LeaveStatus,
  MembershipStatus,
  ScheduleStatus,
  UserRole,
} from '@prisma/client';
import { PaginatedMetaDto } from '../api-pagination.dto';
import { API_UUID_EXAMPLE } from '../api-param.decorators';

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: '操作成功' })
  msg: string;
}

export class AuthUserResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT 访问令牌' })
  token: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}

/** GET /auth/profile */
export class AuthProfileResponseDto {
  @ApiProperty({ description: '用户 ID', example: API_UUID_EXAMPLE })
  userId: string;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({ enum: UserRole, description: '角色' })
  role: UserRole;
}

export class TagResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: 'VIP' })
  name: string;
}

export class GroupResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: '周末班' })
  name: string;
}

export class StudentResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: '张三' })
  name: string;

  @ApiPropertyOptional({ example: '138****8000' })
  phone?: string | null;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: '2026-01-15T00:00:00.000Z' })
  joinedAt?: string;

  @ApiPropertyOptional({ type: [TagResponseDto] })
  tags?: TagResponseDto[];

  @ApiPropertyOptional({ type: [GroupResponseDto] })
  groups?: GroupResponseDto[];
}

export class PaginatedStudentResponseDto {
  @ApiProperty({ type: [StudentResponseDto] })
  items: StudentResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}

export class CoachResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: '王教练' })
  name: string;

  @ApiPropertyOptional({ example: '138****8000' })
  phone?: string | null;

  @ApiPropertyOptional({ example: '十年教学经验' })
  bio?: string | null;
}

export class PaginatedCoachResponseDto {
  @ApiProperty({ type: [CoachResponseDto] })
  items: CoachResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}

export class CourseTypeResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ enum: CourseKind })
  kind: CourseKind;

  @ApiProperty({ example: '团课瑜伽' })
  name: string;

  @ApiProperty({ example: 1 })
  defaultLessonDeduct: number;
}

export class VenueResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: 'A馆1号教室' })
  name: string;

  @ApiPropertyOptional()
  address?: string | null;
}

export class ClassResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: '周一晚瑜伽班' })
  name: string;

  @ApiPropertyOptional({ type: CourseTypeResponseDto })
  courseType?: CourseTypeResponseDto;

  @ApiPropertyOptional({ type: CoachResponseDto })
  coach?: CoachResponseDto | null;
}

export class ScheduleResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: '2026-05-20T10:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ example: '2026-05-20T11:00:00.000Z' })
  endsAt: string;

  @ApiProperty({ enum: ScheduleStatus })
  status: ScheduleStatus;

  @ApiPropertyOptional({ type: ClassResponseDto })
  class?: ClassResponseDto;

  @ApiPropertyOptional({ type: VenueResponseDto })
  venue?: VenueResponseDto;

  @ApiPropertyOptional({ type: CoachResponseDto })
  coach?: CoachResponseDto;
}

export class PaginatedScheduleResponseDto {
  @ApiProperty({ type: [ScheduleResponseDto] })
  items: ScheduleResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}

export class LessonTransactionResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: API_UUID_EXAMPLE })
  studentId: string;

  @ApiProperty({ example: -1 })
  delta: number;

  @ApiProperty({ example: 'CLASS_CHECK_IN' })
  reason: string;

  @ApiProperty({ example: 'checkin:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002' })
  businessKey: string;

  @ApiPropertyOptional({ example: API_UUID_EXAMPLE })
  operatorId?: string | null;

  @ApiPropertyOptional({ example: 10 })
  beforeRemaining?: number | null;

  @ApiPropertyOptional({ example: 9 })
  afterRemaining?: number | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown> | null;
}

export class MembershipResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: API_UUID_EXAMPLE })
  studentId: string;

  @ApiProperty({ example: '瑜伽20次卡' })
  title: string;

  @ApiProperty({ example: 20 })
  totalLessons: number;

  @ApiProperty({ example: 18 })
  remainingLessons: number;

  @ApiProperty({ enum: MembershipStatus })
  status: MembershipStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  validTo?: string;
}

export class MembershipDetailResponseDto extends MembershipResponseDto {
  @ApiPropertyOptional({ type: [LessonTransactionResponseDto], description: '最近课时流水' })
  transactions?: LessonTransactionResponseDto[];
}

export class ClassEnrollmentResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  classId: string;

  @ApiProperty({ example: API_UUID_EXAMPLE })
  studentId: string;

  @ApiPropertyOptional({ type: StudentResponseDto })
  student?: StudentResponseDto;
}

export class AttendanceRecordResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ enum: AttendanceStatus })
  status: AttendanceStatus;

  @ApiPropertyOptional({ enum: AttendanceMethod })
  method?: AttendanceMethod | null;

  @ApiPropertyOptional()
  checkInAt?: string | null;

  @ApiPropertyOptional()
  checkOutAt?: string | null;
}

export class CheckInResponseDto {
  @ApiProperty({ type: AttendanceRecordResponseDto })
  attendance: AttendanceRecordResponseDto;

  @ApiProperty({ description: '是否已扣课时', example: true })
  deducted: boolean;
}

export class LeaveRequestResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ enum: LeaveStatus })
  status: LeaveStatus;
}

export class QrTokenResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: 'hex-token' })
  token: string;

  @ApiProperty({ example: '2026-05-20T12:00:00.000Z' })
  expiresAt: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: API_UUID_EXAMPLE })
  id: string;

  @ApiProperty({ example: 'ORD1716123456A1B2C3D4' })
  orderNo: string;

  @ApiPropertyOptional({ example: API_UUID_EXAMPLE })
  studentId?: string | null;

  @ApiProperty({ example: '瑜伽年卡' })
  title: string;

  @ApiProperty({ description: '金额（分，整数）', example: 399900 })
  amountCents: number;

  @ApiProperty({ description: 'ISO 4217 货币代码', example: 'CNY' })
  currency: string;

  @ApiProperty({ description: '金额展示（主货币单位，两位小数）', example: '3999.00' })
  amount: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'PAID', 'REFUNDED', 'CANCELLED'] })
  status: string;

  @ApiPropertyOptional({ example: 'MOCK', enum: ['MOCK', 'WECHAT', 'ALIPAY'], nullable: true })
  paymentProvider?: string | null;

  @ApiPropertyOptional({ example: 'MOCK_TX_20260519120000', nullable: true })
  providerTradeNo?: string | null;

  @ApiPropertyOptional({ example: 'create-order-7f3c2a1b-9e4d-4b2c-8a1f6d3e5c7b' })
  idempotencyKey?: string | null;

  @ApiPropertyOptional({ example: '2026-05-20T08:00:00.000Z', nullable: true })
  paidAt?: string | null;

  @ApiPropertyOptional({ example: '2026-05-21T08:00:00.000Z', nullable: true })
  refundedAt?: string | null;

  @ApiProperty({ example: '2026-05-20T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-20T08:00:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '关联学员（列表/详情接口 include 时返回）',
    example: { id: API_UUID_EXAMPLE, name: '张三', phone: '13800000000' },
  })
  student?: { id: string; name: string; phone?: string | null } | null;
}

export class PaginatedOrderResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;
}

export class AttendanceStatisticsResponseDto {
  @ApiProperty({ example: 100 })
  totalRecords: number;

  @ApiProperty({ example: { PRESENT: 80, LATE: 5, ABSENT: 10, LEAVE: 5 } })
  byStatus: Record<string, number>;

  @ApiProperty({ example: 0.85 })
  attendanceRate: number;
}

export class LessonStatisticsResponseDto {
  @ApiProperty({ example: 42 })
  totalDeductedLessons: number;
}

export class RevenueStatisticsResponseDto {
  @ApiProperty({ example: 15 })
  orderCount: number;

  @ApiProperty({ description: '收入合计（分）', example: 1258000 })
  totalAmountCents: number;

  @ApiProperty({ example: '12580.00' })
  totalAmount: string;
}

export class HealthCheckDetailDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiPropertyOptional({ example: 3 })
  latencyMs?: number;

  @ApiPropertyOptional()
  error?: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-05-20T08:00:00.000Z' })
  timestamp: string;
}

export class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({
    example: { mysql: { ok: true, latencyMs: 2 }, redis: { ok: true, latencyMs: 1 } },
  })
  checks: { mysql: HealthCheckDetailDto; redis: HealthCheckDetailDto };
}
