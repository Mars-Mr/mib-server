# 密钥与生产环境配置

## 原则

1. **生产环境禁止**使用仓库内置的 dev 默认值（`dev_only_jwt_secret_*`、`password`、`change_me_in_production` 等）。
2. **密钥长度**：`JWT_SECRET`、`PAYMENT_WEBHOOK_SECRET` ≥ 32 字符；`REDIS_PASSWORD`、`MYSQL_ROOT_PASSWORD` ≥ 16 字符。
3. **不提交真实密钥**：`.env`、`.env.production` 已在 `.gitignore`；仅提交 `.env.example` / `.env.production.example`。
4. 启动时 `validateEnvConfig` 在 `NODE_ENV=production` 下校验失败会 **抛错退出**（见 `main.ts` → `getEnvConfig()`）。

## 配置文件

| 文件 | 用途 |
|------|------|
| `.env` | 本地开发（可选） |
| `.env.production` | 生产部署（不提交） |
| `.env.example` | 开发变量说明，无可用默认密钥 |
| `.env.production.example` | 生产必填项清单 |

加载顺序：`env.loader.ts` 先读 `.env`，再读 `.env.{NODE_ENV}`（后者覆盖）。

## 部署建议

- Kubernetes / Docker：用 Secret 注入环境变量，不写进镜像。
- CI/CD：在流水线 Secret 中配置 `JWT_SECRET`、`DATABASE_URL` 等。
- 轮换密钥后需重新登录（JWT 失效旧 token 直至过期）。

## 代码约定

- `AuthModule` / `JwtStrategy` 仅使用 `ENV_CONFIG.JWT_SECRET`，无硬编码 fallback。
- `AuthService` 通过 `JwtModule` 统一签名，不重复持有 secret 字符串。

## Swagger

- 生产默认 `SWAGGER_ENABLED=false`；开启时必须配置 `SWAGGER_BASIC_USER` / `SWAGGER_BASIC_PASSWORD`（见 `env.schema.ts`）。
- 详见 [SWAGGER.md](./SWAGGER.md)。
