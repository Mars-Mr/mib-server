import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = process.env.SWAGGER_PATH ?? 'api-docs';

/** OpenAPI JSON export path (relative to app root). */
export const SWAGGER_JSON_PATH = `${SWAGGER_UI_PATH}-json`;

/** OpenAPI YAML export path (relative to app root). */
export const SWAGGER_YAML_PATH = `${SWAGGER_UI_PATH}-yaml`;

export type SwaggerPaths = {
  uiPath: string;
  jsonPath: string;
  yamlPath: string;
};

export function isSwaggerEnabled(): boolean {
  const flag = process.env.SWAGGER_ENABLED;
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  return true;
}

export function setupSwagger(app: INestApplication): SwaggerPaths | null {
  if (!isSwaggerEnabled()) return null;

  const config = new DocumentBuilder()
    .setTitle('MIB Server API')
    .setDescription('MIB Server 后端 REST API 文档（由 @nestjs/swagger 根据路由与 DTO 自动生成）')
    .setVersion(process.env.APP_VERSION ?? '0.0.1')
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
    .addTag('orders', '订单与计费')
    .addTag('statistics', '统计报表')
    .addTag('health', '健康检查')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    yamlDocumentUrl: SWAGGER_YAML_PATH,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  return {
    uiPath: `/${SWAGGER_UI_PATH}`,
    jsonPath: `/${SWAGGER_JSON_PATH}`,
    yamlPath: `/${SWAGGER_YAML_PATH}`,
  };
}

export function swaggerBaseUrl(port: number): string {
  const host = process.env.SWAGGER_HOST ?? 'localhost';
  return `http://${host}:${port}`;
}
