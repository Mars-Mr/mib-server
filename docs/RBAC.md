# RBAC：功能权限与数据权限

> 租户级隔离见 [TENANT.md](./TENANT.md)（`tenantId` + Prisma 自动过滤）。

## 模型

| 概念 | 说明 |
|------|------|
| **Permission** | 功能权限点，如 `students:read`、`schedules:write` |
| **Role** | 业务角色（`code` 与 `UserRole` 枚举一致），通过 `RolePermission` 关联权限 |
| **Tenant** | 租户 / 门店，用于 **tenantId** 硬隔离 |
| **User.tenantId** | 用户主租户；可多租户：`UserTenant` |
| **DataScope** | 租户内的行级范围，与 Permission 分离 |

`User.role` 仍保留（兼容 JWT / 审计）；**能否调接口**看 Permission，**租户边界**看 `tenantId`，**租户内能看到哪些行**看 DataScope。

## 数据范围（DataScope）

| `dataScope` | 典型角色 | 过滤规则 |
|-------------|----------|----------|
| `all` | 拥有 `org:cross` 的平台管理员 | 仅跳过 tenant 自动过滤；DataScope 不过滤 |
| `organization` | 教务 `STAFF` | 在已授权 `tenantIds` 内（与 Prisma tenant 扩展叠加） |
| `coach_owned` | `COACH` | 仅本人 `coachId` 的排课/班级/关联学员 |
| `self` | `STUDENT` | 仅本人学员档案、已报班级排课 |

实现：`DataScopeService` + `AsyncLocalStorage`（`AccessContextInterceptor` 在 JWT 之后注入）。

## 请求头

- `X-Tenant-Id`：在用户已归属的租户内切换当前租户
- `X-Organization-Id`：兼容旧客户端

## 控制器

- **遗留**：`@Roles(UserRole.ADMIN, …)` — 仍可用
- **推荐**：`@RequirePermissions(Permission.XXX)` — 与角色解耦
- 二者满足其一即通过（`RolesGuard`）

## 种子与迁移

```bash
yarn prisma:migrate:deploy
yarn prisma db seed
```

`prisma/rbac-seed.ts` 创建默认租户 `default`、`Permission`、`Role` 及默认映射。

## 已接入 DataScope 的服务

- `StudentsService`
- `CoursesService`（排课）
- `CoachesService`

其他模块依赖 **tenantId 自动过滤**；教练级规则可按需继续接入 `DataScopeService`。
