# 审计字段（createdBy / updatedBy / deletedBy）

核心表在 Prisma 中统一增加可选字符串字段，值为操作人 `User.id`（不设外键，便于跨租户与历史保留）。

| 表 | 说明 |
|----|------|
| `Schedule` | 排课创建/修改/取消 |
| `MembershipCard` | 会员卡 CRUD、课时余额变更 |
| `Order` | 下单、支付、退款 |
| `LessonTransaction` | 课时调整流水（含签到扣课）；含 `studentId`、`businessKey`、`beforeRemaining`/`afterRemaining`、`operatorId`、`metadata` |

## 写入约定

- 请求经 `AccessContextInterceptor` 后，通过 `runWithAuditUser(userId, …)` 在 AsyncLocalStorage 中保存当前用户。
- 服务层在 `create` / `update` 的 `data` 中合并：
  - `auditOnCreate()` → `createdBy`, `updatedBy`
  - `auditOnUpdate()` → `updatedBy`
  - `auditOnDelete()` → `deletedBy`, `updatedBy`（如排课取消）
- 无登录上下文时（支付回调、定时任务等）字段为 `null`，不强行写入。

## 实现位置

- `src/common/audit/audit-context.ts`
- 业务：`billing.service.ts`、`memberships*.ts`、`courses.service.ts`、`attendance-lesson-deduct.ts`、`membership-lessons.ts`
