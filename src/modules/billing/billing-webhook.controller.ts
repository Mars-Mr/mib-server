import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiIdempotent } from '../../common/idempotency/idempotent.decorator';
import { PAYMENT_SIGNATURE_HEADER } from './billing.constants';
import { ApiPaymentWebhookResponses } from './billing.swagger.decorators';
import { PAYMENT_WEBHOOK_OPERATION_DESCRIPTION } from './billing.swagger-examples';
import { BillingService } from './billing.service';
import { PAYMENT_CALLBACK_SWAGGER_EXAMPLES, PaymentCallbackDto } from './dto/payment-callback.dto';

/** Payment provider callbacks — no JWT; protected by HMAC signature. */
@ApiTags('payment-webhooks')
@Controller('webhooks/payment')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @HttpCode(200)
  @ApiIdempotent('payment:callback', {
    required: false,
    bodyKeyFields: ['provider', 'providerTradeNo', 'event'],
  })
  @ApiOperation({
    summary: '支付/退款回调',
    description: PAYMENT_WEBHOOK_OPERATION_DESCRIPTION,
  })
  @ApiBody({
    type: PaymentCallbackDto,
    examples: PAYMENT_CALLBACK_SWAGGER_EXAMPLES,
  })
  @ApiPaymentWebhookResponses()
  handlePaymentCallback(
    @Body() dto: PaymentCallbackDto,
    @Headers(PAYMENT_SIGNATURE_HEADER) signature?: string,
  ) {
    return this.billingService.handlePaymentCallback(dto, signature);
  }
}
