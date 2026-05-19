# API 文档与接口规范

## 文档地址

| 环境 | UI | OpenAPI JSON | OpenAPI YAML |
|------|-----|--------------|--------------|
| 本地（默认开启） | `http://localhost:3000/api-docs` | `http://localhost:3000/api-docs-json` | `http://localhost:3000/api-docs-yaml` |

路径可通过 `SWAGGER_PATH` 修改；生产暴露策略见 [SWAGGER.md](./SWAGGER.md)。

## 约定

### 鉴权

- 除 `POST /auth/login`、`GET /health`、`POST /webhooks/payment` 外，请求头：`Authorization: Bearer <JWT>`。
- 多租户：可选 `X-Tenant-Id`（或 `X-Organization-Id`）。
- Swagger 中在 **Authorize** 填写 JWT（无需 `Bearer` 前缀）。

### 统一错误响应

HTTP 4xx/5xx 返回 `ApiErrorResponseDto`：

```json
{
  "statusCode": 400,
  "message": "请求参数不合法",
  "error": "Bad Request"
}
```

校验失败时 `message` 可能为字符串数组。

### 统一分页（推荐）

查询：`page`（从 1）、`pageSize`（1–100，默认 20），见 `PaginationQueryDto`。

响应：

```json
{
  "items": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

部分列表接口当前仍返回**裸数组**，以 Swagger 各接口 `description` 为准；新接口请优先采用 `{ items, meta }`。

### 幂等写操作

带 `Idempotency-Key` 的请求头（见 `@ApiIdempotent` 标注的接口）；重复提交返回首次成功结果。

### 代码规范

| 项 | 做法 |
|----|------|
| 操作说明 | `@ApiOperation({ summary, description })` |
| 成功响应 | `ApiOkData` / `ApiCreatedData` / `ApiArrayOk` / `ApiPaginatedOk` |
| 错误响应 | 组合装饰器已含 `ApiProtectedErrorResponses` 或 `ApiPublicErrorResponses` |
| 请求体 | class-validator DTO + `@ApiProperty` / `@ApiPropertyOptional` |
| 查询参数 | 独立 `*QueryDto` + `@Query()`，勿使用 `@Query('field')` |
| 响应体 | `src/common/swagger/dto/responses.dto.ts` 中的 Response DTO，避免直接暴露 Prisma 类型 |
| JWT 接口 | Controller 类上 `@ApiBearerAuth('jwt')` |

共享装饰器：`src/common/swagger/api-response.decorators.ts`。
