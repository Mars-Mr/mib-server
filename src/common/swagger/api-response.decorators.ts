import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.dto';
import {
  AuthProfileResponseDto,
  LoginResponseDto,
  MessageResponseDto,
  OkResponseDto,
} from './dto/responses.dto';

/** 公开接口（如登录）常用错误响应 */
export function ApiPublicErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({ description: '请求参数错误', type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ description: '认证失败', type: ApiErrorResponseDto }),
    ApiTooManyRequestsResponse({ description: '请求过于频繁', type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ description: '服务器内部错误', type: ApiErrorResponseDto }),
  );
}

/** 需 JWT 的接口常用错误响应 */
export function ApiProtectedErrorResponses() {
  return applyDecorators(
    ApiPublicErrorResponses(),
    ApiForbiddenResponse({ description: '无访问权限', type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ description: '资源不存在', type: ApiErrorResponseDto }),
    ApiConflictResponse({ description: '资源冲突或乐观锁失败', type: ApiErrorResponseDto }),
  );
}

/** 登录成功 */
export function ApiLoginResponses() {
  return applyDecorators(
    ApiOkResponse({ description: '登录成功，返回 JWT 与用户信息', type: LoginResponseDto }),
    ApiPublicErrorResponses(),
  );
}

/** GET /auth/profile */
export function ApiAuthProfileResponses() {
  return applyDecorators(
    ApiOkResponse({ description: '当前登录用户', type: AuthProfileResponseDto }),
    ApiProtectedErrorResponses(),
  );
}

/** 简单消息体 `{ msg: string }` */
export function ApiMessageOk(description = '操作成功') {
  return applyDecorators(
    ApiOkResponse({ description, type: MessageResponseDto }),
    ApiProtectedErrorResponses(),
  );
}

/** 列表接口当前返回数组（非分页包装） */
export function ApiArrayOk(type: Type<unknown>, description: string) {
  return applyDecorators(
    ApiOkResponse({ description, type, isArray: true }),
    ApiProtectedErrorResponses(),
  );
}

/** 标准分页列表 `{ items, meta }` */
export function ApiPaginatedOk(paginatedType: Type<unknown>, description: string) {
  return applyDecorators(
    ApiOkResponse({ description, type: paginatedType }),
    ApiProtectedErrorResponses(),
  );
}

export function ApiOkData(type: Type<unknown>, options?: { description?: string; isArray?: boolean }) {
  return applyDecorators(
    ApiOkResponse({
      description: options?.description ?? '操作成功',
      type,
      isArray: options?.isArray,
    }),
    ApiProtectedErrorResponses(),
  );
}

export function ApiCreatedData(type: Type<unknown>, description = '创建成功') {
  return applyDecorators(ApiCreatedResponse({ description, type }), ApiProtectedErrorResponses());
}

export function ApiDeleted(description = '删除成功') {
  return applyDecorators(
    ApiOkResponse({ description, schema: { example: { ok: true } } }),
    ApiProtectedErrorResponses(),
  );
}

export function ApiNoContentData(description = '无内容') {
  return applyDecorators(ApiNoContentResponse({ description }), ApiProtectedErrorResponses());
}
