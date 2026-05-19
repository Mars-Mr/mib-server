# 多租户数据隔离（tenantId）

## 决策

本项目按 **多租户 SaaS** 设计：每条核心业务数据归属一个 `Tenant`（租户，等同品牌/集团下的门店或校区）。

| 字段 | 含义 |
|------|------|
| `Tenant` | 租户主表（原 `Organization`） |
| `tenantId` | 外键，出现在所有核心表 |
| `UserTenant` | 用户可访问多个租户（原 `UserOrganization`） |

`campusId` / `orgId` 未单独建模：多校区时可用多个 `Tenant`，或后续在 `Tenant` 下再加 `Campus` 层级。

## 带 `tenantId` 的核心表

- `User`（`@@unique([tenantId, username])`）
- `Student`、`Coach`、`CourseType`、`Class`、`Schedule`
- `MembershipCard`、`Order`
- `Venue`（场地同样按租户隔离）

## 自动过滤

`PrismaService` 通过 `prismaTenantExtension` 在以下操作上合并 `tenantId` 条件：

- 读：`findMany` / `findFirst` / `findUnique`（内部转为 `findFirst`）/ `count` / `aggregate`
- 写：`update` / `delete` / `updateMany` / `deleteMany`
- 建：`create` / `createMany` / `upsert`（自动写入当前租户）

过滤规则来自请求上下文 `AccessContext`：

- 普通用户：`tenantId IN (用户可访问租户)`，或 `X-Tenant-Id` 指定单个租户
- 平台管理员（`org:cross` + `dataScope: all`）：**不**自动加 `tenantId` 条件

### 绕过租户过滤

以下场景使用 `runWithoutTenantScope()`：

- 登录（按 `tenantCode` + `username` 查用户）
- JWT 首次加载用户
- `prisma db seed`、迁移脚本
- 支付回调 `POST /webhooks/payment`（按订单号全局定位）

## 登录

```json
POST /auth/login
{
  "tenantCode": "default",
  "username": "admin",
  "password": "123456"
}
```

单租户部署可省略 `tenantCode`，默认 `default`。

## 请求头

- `X-Tenant-Id`: 在已授权租户列表内切换当前租户
- `X-Organization-Id`: 兼容旧客户端，行为相同

## 与 RBAC 数据权限的关系

| 层 | 作用 |
|----|------|
| **tenantId（Prisma 扩展）** | 租户之间绝对不能互见 |
| **DataScope（教练/学员）** | 同一租户内的行级范围 |

二者叠加：先租户，再教练只看自己的课/学员。

## 新建数据

HTTP 创建接口在已登录且带租户上下文时，扩展会自动写入 `tenantId`。显式传 `tenantId` 时须属于当前用户可访问租户。

排课、会员卡、订单等会从关联的 `Class` / `Student` 复制 `tenantId`。

## 迁移

```bash
yarn prisma:migrate:deploy
yarn prisma db seed
```

迁移 `20250523100000_tenant_isolation` 将 `Organization` 重命名为 `Tenant`，`organizationId` 重命名为 `tenantId`，并为 `CourseType` / `Schedule` / `MembershipCard` / `Order` 补列与回填。
