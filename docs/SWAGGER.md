# Swagger / OpenAPI 暴露控制

生产环境**不得**将完整接口文档暴露在公网。本项目通过环境变量与中间件分层控制。

## 默认行为

| 环境 | `SWAGGER_ENABLED` 未设置时 | 文档路径 |
|------|---------------------------|----------|
| `development` / `test` | **开启** | `http://localhost:3000/api-docs`（可改 `SWAGGER_PATH`） |
| `production` | **关闭** | 不注册 Swagger |

显式设置 `SWAGGER_ENABLED=0` 或 `false` 可在开发环境关闭；生产需 `SWAGGER_ENABLED=1` 才会开启。

## 生产环境若必须开启文档

同时满足：

1. `SWAGGER_ENABLED=1`
2. **强 Basic Auth**（启动校验，缺一不可）  
   - `SWAGGER_BASIC_USER`  
   - `SWAGGER_BASIC_PASSWORD`（≥ 12 字符，且不能为 `change_me_swagger_password` 等内置弱值）
3. 建议 **`SWAGGER_INTERNAL_ONLY=1`**（默认：生产且 Swagger 开启时为 `true`）  
   - 仅允许内网 / 本机 IP（10/172.16–31/192.168、127.0.0.1、链路本地）  
   - 公网 IP 访问 `/api-docs`、`/api-docs-json`、`/api-docs-yaml` 返回 403  
   - 反向代理后请确保 Nest `trust proxy` 能拿到真实客户端 IP（生产已 `trust proxy = 1`）

示例（仅内网运维可访问）：

```env
SWAGGER_ENABLED=1
SWAGGER_INTERNAL_ONLY=1
SWAGGER_BASIC_USER=docs_admin
SWAGGER_BASIC_PASSWORD=<随机强密码>
```

## 开发环境

`.env.example` 中 `SWAGGER_ENABLED=1` 仅用于本地；Basic Auth 可选。需要时可自行配置 `SWAGGER_BASIC_*` 以模拟生产。

## API 编写规范

接口文档约定（`@ApiOperation`、Response DTO、分页与错误模型等）见 [API.md](./API.md)。

## 相关代码

- `src/swagger.ts` — 注册 OpenAPI
- `src/common/swagger/apply-swagger-guards.ts` — Basic Auth + 内网限制
- `src/common/config/env.schema.ts` — 生产密钥与 Swagger 校验
