import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiIdempotent } from '../../common/idempotency/idempotent.decorator';
import { IdempotencyClientKey } from '../../common/idempotency/idempotency-client-key.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiCreateOrderResponses, ApiListOrdersResponse } from './billing.swagger.decorators';
import {
  CREATE_ORDER_OPERATION_DESCRIPTION,
  CREATE_ORDER_REQUEST_EXAMPLE,
} from './billing.swagger-examples';
import { BillingService } from './billing.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth('jwt')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @ApiIdempotent('order:create')
  @ApiOperation({
    summary: '创建订单（幂等）',
    description: CREATE_ORDER_OPERATION_DESCRIPTION,
  })
  @ApiBody({ type: CreateOrderDto, examples: { default: { value: CREATE_ORDER_REQUEST_EXAMPLE } } })
  @ApiCreateOrderResponses()
  create(@Body() dto: CreateOrderDto, @IdempotencyClientKey() idempotencyKey: string) {
    return this.billingService.createOrder(dto, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: '订单列表', description: '按 `createdAt` 倒序，含关联学员信息。' })
  @ApiListOrdersResponse()
  findAll() {
    return this.billingService.findAll();
  }
}
