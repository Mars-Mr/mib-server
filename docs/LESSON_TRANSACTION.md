# 课时流水（LessonTransaction）

每次课时余额变更对应一条流水，便于对账与排查。

## 字段

| 字段 | 说明 |
|------|------|
| `studentId` | 学员（冗余，便于按学员查流水） |
| `businessKey` | 全局唯一业务键（幂等） |
| `operatorId` | 操作人 `User.id`（与 `createdBy` 同源，专用于流水审计） |
| `beforeRemaining` / `afterRemaining` | 变更前后卡内剩余课时 |
| `metadata` | JSON 扩展，如 `{ "source": "check_in" }` |

## businessKey 约定

| 场景 | 格式 |
|------|------|
| 签到扣课 | `checkin:{studentId}:{scheduleId}` |
| 后台手动调整 | `adjust:{membershipId}:{uuid}` |
| 历史数据迁移 | `legacy:{transactionId}` |

写入封装：`src/common/prisma/lesson-transaction.ts`（`lessonTransactionCreateData`）。
