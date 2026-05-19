# 源码目录结构

```
src/
  common/                 # 跨模块共享能力
    config/               # 环境变量校验与读取
    errors/               # 全局异常过滤器
    logger/               # 结构化日志、访问/审计通道
    guards/               # JWT、角色守卫
    interceptors/         # 访问日志、行为审计
    decorators/           # @Roles、@RequirePermissions、@AuditAction、@UserBehavior
    rbac/                 # 权限点、AccessContext、DataScope（见 docs/RBAC.md）
infrastructure/prisma/tenant/  # tenantId 自动过滤扩展（见 docs/TENANT.md）
    swagger/              # OpenAPI 模型与装饰器
    health/               # 健康检查
    utils/                # 工具函数
  infrastructure/         # 基础设施适配层
    prisma/               # 数据库 ORM
    redis/                # 缓存、锁、限流、幂等（见 redis/REDIS_LOCKS.md）
    queue/                # 消息队列（预留）
    storage/              # 对象存储（预留）
    infrastructure.module.ts
  modules/                # 业务领域模块
    auth/
    students/
    courses/
    attendance/
    memberships/
    billing/
    statistics/
  jobs/                   # 后台任务入口（预留）
  scripts/                # 运维脚本（如 DB 备份）
  app.module.ts
  main.ts
  swagger.ts
```

## 配置（P0）

- `AppConfigModule`：`@nestjs/config` + Zod schema（`env.schema.ts`）
- 启动前：`main.ts` 调用 `loadEnvFile()` + `getEnvConfig()`，生产环境配置不合法则进程退出
- 注入：优先 `@Inject(ENV_CONFIG)` 获取类型安全的 `EnvConfig`；或 `ConfigService.get('JWT_SECRET')`
- 生产必填且禁止弱密钥 / dev 默认值：`JWT_SECRET`（≥32）、`PAYMENT_WEBHOOK_SECRET`（≥32）、`DATABASE_URL`、`REDIS_PASSWORD`（≥16）、`MYSQL_ROOT_PASSWORD`（≥16）；校验失败进程退出
- 部署使用 `.env.production` 或平台 Secret，勿提交真实密钥（见 [docs/SECRETS.md](../docs/SECRETS.md)）
- 禁止值与 dev 内置 fallback 列表见 `env.constants.ts`（`isForbiddenSecretValue`）

## 导入约定

- 基础设施：`../../infrastructure/prisma/...`、`../../infrastructure/redis/...`
- 或路径别名：`@infrastructure/prisma/prisma.service`、`@common/guards/jwt-auth.guard`

## 数据库迁移

见 [prisma/MIGRATIONS.md](../prisma/MIGRATIONS.md)：开发 `yarn prisma:migrate:dev`，生产 `yarn prisma:migrate:deploy:safe`（先备份），禁止生产 `db push`。

## 迁移说明

原 `src/prisma`、`src/redis` 已迁入 `src/infrastructure/`。原 `modules/auth` 下守卫已提升至 `common/guards` 与 `common/decorators/roles.decorator.ts`。

## 请求幂等

- 装饰器 `@Idempotent` / `@ApiIdempotent` + 全局 `IdempotencyInterceptor`。
- 详见 [common/idempotency/IDEMPOTENCY.md](common/idempotency/IDEMPOTENCY.md)。

## Redis 锁与正确性

- **原则**：Redis 锁降低冲突；**数据库唯一约束 + 事务**保证最终正确性。详见 [infrastructure/redis/REDIS_LOCKS.md](infrastructure/redis/REDIS_LOCKS.md)。
- **封装**：`RedisBusinessService.runWithBusinessLock` — 短 TTL、可选续期、`operationTimeoutMs` 硬超时、释放锁保证在 `finally`。
- **不要**在关键路径上仅依赖 `SET NX`；多 Redis 主节点时需 Redlock 或改用 DB 锁。
