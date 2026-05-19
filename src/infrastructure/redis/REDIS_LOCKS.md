# Redis 分布式锁使用原则

Redis 锁用于**降低并发冲突**，**不能**作为唯一正确性保障。最终一致性必须由数据库保证。

## 生产原则

| 层级 | 职责 |
|------|------|
| **数据库** | 唯一约束、条件 `updateMany`、Serializable 事务、幂等键 — **最终正确性** |
| **Redis 锁** | 减少同时进入临界区的请求数，降低死锁/重试成本 — **辅助** |

1. **关键业务不要只依赖 Redis 锁**  
   锁丢失、过期、主从切换都可能导致两个持有者；业务必须能在无锁情况下仍正确（或安全失败）。

2. **TTL 要短**  
   防止进程崩溃导致长期占锁。本仓库默认业务锁 15–30 秒。

3. **业务执行要有硬超时**  
   `runWithBusinessLock` / `runWithBusinessLocks` 通过 `operationTimeoutMs` 限制 `fn` 时长，超时后释放锁并抛出 `LockOperationTimeoutError`（业务层可映射为 408）。

4. **长任务需要续期**  
   若 `fn` 可能超过 TTL，设置 `renewIntervalMs`（约为 TTL 的一半），在持有期间调用 `renewLock`（Lua 校验 token）。

5. **多 Redis / 多主节点**  
   当前实现为单实例 `SET key token NX EX` + token 校验释放，**不**满足 Redlock 语义。多主或集群跨节点强一致场景应：
   - 使用 [Redlock](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/) 等方案，或  
   - **优先使用数据库行锁 / 唯一约束**（本仓库排课、签到已采用）。

## API

- 底层：`RedisService.acquireLock` / `renewLock` / `releaseLock`
- 业务：`RedisBusinessService.runWithBusinessLock`、`runWithBusinessLocks`
- 低层手动：`acquireBusinessLock` + `releaseBusinessLock`（需自行处理超时与续期）

## 本仓库映射

| 场景 | Redis | 数据库正确性 |
|------|--------|----------------|
| 签到扣课 | `checkin:{studentId}:{scheduleId}` | `LessonTransaction.businessKey` 唯一；`remainingLessons` 条件扣减；Serializable |
| 创建/改排课 | `schedule:coach:*` / `schedule:venue:*` | `ScheduleResourceLock` 唯一 `(resourceType, resourceId, timeSlotKey)`；Serializable |
| 创建订单 | 无锁 | `Order.idempotencyKey` 唯一 |
| 支付回调 | 无锁 | `Order` 状态条件更新；`(paymentProvider, providerTradeNo)` 唯一 |
