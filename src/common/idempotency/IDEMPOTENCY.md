# 请求级幂等（Idempotency-Key）

全局 `IdempotencyInterceptor` + 路由装饰器 `@Idempotent` / `@ApiIdempotent`。

## 流程

1. 读取请求头 `Idempotency-Key`（或按 `bodyKeyFields` 从 body 派生）。
2. Redis `SET NX` 写入 `{ phase: 'processing' }`（短 TTL）。
3. 执行业务；**仅 2xx** 将 `{ phase: 'completed', statusCode, body }` 缓存 24h。
4. 失败或非 2xx 删除 processing 键，允许客户端重试。
5. 重复请求：直接返回首次成功响应；并发 processing 时短暂轮询，超时返回 409。

**正确性仍以数据库为准**（唯一约束、条件更新、事务）。HTTP 层幂等只保证「同一 Key 的客户端看到同一份成功响应」。

## 用法

```typescript
@ApiIdempotent('order:create')
@Post()
create(@Body() dto: CreateOrderDto, @IdempotencyClientKey() key: string) {
  return this.service.create(dto, key);
}
```

支付回调（可无 Header，从 body 派生）：

```typescript
@ApiIdempotent('payment:callback', {
  required: false,
  bodyKeyFields: ['provider', 'providerTradeNo', 'event'],
})
```

## 已启用 scope

| Scope | 接口 |
|-------|------|
| `order:create` | `POST /orders` |
| `payment:callback` | `POST /webhooks/payment` |
| `attendance:check-in` | `POST /attendance/check-in` |
| `membership:create` | `POST /memberships` |
| `membership:adjust-lessons` | `POST /memberships/:id/adjust-lessons` |
| `schedule:create` | `POST /schedules` |
