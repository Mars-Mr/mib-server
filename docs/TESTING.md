# 测试说明

## 单元测试

```bash
yarn test
```

覆盖：环境配置、扣课逻辑、排课时间片、Redis 工具、会员调课条件更新等。

## 集成 / E2E 测试

依赖 **MySQL** 与 **Redis**（与 `.env` / CI 一致）：

```bash
yarn prisma:migrate:deploy
yarn test:e2e
```

| 文件 | 覆盖 |
|------|------|
| `test/app.e2e-spec.ts` | 健康检查 |
| `test/auth.e2e-spec.ts` | 登录、未授权、角色拒绝 |
| `test/students.e2e-spec.ts` | 学员 CRUD、DTO 校验 |
| `test/courses.e2e-spec.ts` | 教练/场地冲突、重复入班 |
| `test/attendance.e2e-spec.ts` | 签到扣课、幂等、请假、并发 20 次 |
| `test/memberships.e2e-spec.ts` | 调课、并发扣减不为负 |
| `test/redis.e2e-spec.ts` | 锁持有者释放、限流窗口 |

每个 E2E 文件会 `resetDatabase()` 后独立造数，串行执行（`maxWorkers: 1`）。

## 并发场景

- **签到**：同一 `studentId + scheduleId` 并发 20 次 → 1 条签到、1 条 `businessKey` 流水、余额只减 1。
- **调课**：5 课时并发 20 次 `-1` → 最多成功 5 次，余额不为负。
