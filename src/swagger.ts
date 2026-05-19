import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { EnvConfig } from './common/config/env.types';
import { applySwaggerGuards } from './common/swagger/apply-swagger-guards';
import { SWAGGER_EXTRA_MODELS } from './common/swagger/swagger-extra-models';

export type SwaggerPaths = {
  uiPath: string;
  jsonPath: string;
  yamlPath: string;
};

export function setupSwagger(app: INestApplication, env: EnvConfig): SwaggerPaths | null {
  if (!env.SWAGGER_ENABLED) {
    return null;
  }

  const uiPath = env.SWAGGER_PATH;
  const jsonPath = `${uiPath}-json`;
  const yamlPath = `${uiPath}-yaml`;

  const config = new DocumentBuilder()
    .setTitle('MIB Server API')
    .setDescription(
      [
        'MIB Server 后端 REST API 文档。',
        '',
        '**统一错误响应**：`ApiErrorResponseDto`（含 statusCode、message）。',
        '**统一分页响应**：`Paginated*ResponseDto`（items + meta）；部分列表接口当前仍返回数组，以接口说明为准。',
        '**鉴权**：除登录/健康检查/支付回调外，请在 Authorize 中填写 JWT（无需 Bearer 前缀）。',
        '**请求幂等**：带 `@ApiIdempotent` 的写接口需 `Idempotency-Key`（支付回调可按 body 派生），重复请求返回首次成功响应。',
        '**支付回调**：`POST /webhooks/payment` 使用 `X-Payment-Signature`（HMAC-SHA256），详见该接口说明与请求示例。',
      ].join('\n'),
    )
    .setVersion(env.APP_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '登录后获得的 JWT，在 Authorize 中填写（无需加 Bearer 前缀）',
      },
      'jwt',
    )
    .addTag('auth', '认证与用户')
    .addTag('students', '学员、标签、分组')
    .addTag('coaches', '教练')
    .addTag('courses', '课程类型、班级、场地、排课')
    .addTag('memberships', '会员卡与课时')
    .addTag('attendance', '签到、请假、二维码')
    .addTag('orders', '订单创建与查询（需 Idempotency-Key）')
    .addTag('payment-webhooks', '支付平台回调（HMAC 验签，无需 JWT）')
    .addTag('statistics', '统计报表')
    .addTag('health', '健康检查')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    extraModels: SWAGGER_EXTRA_MODELS,
  });

  const routePaths = {
    ui: `/${uiPath}`,
    json: `/${jsonPath}`,
    yaml: `/${yamlPath}`,
  };

  applySwaggerGuards(app, env, routePaths);

  SwaggerModule.setup(uiPath, app, document, {
    jsonDocumentUrl: jsonPath,
    yamlDocumentUrl: yamlPath,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  return {
    uiPath: routePaths.ui,
    jsonPath: routePaths.json,
    yamlPath: routePaths.yaml,
  };
}

export function swaggerBaseUrl(port: number, host: string): string {
  return `http://${host}:${port}`;
}
