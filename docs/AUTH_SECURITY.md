# 登录与认证安全

## 登录防护

| 能力 | 实现 |
|------|------|
| IP + 用户名双维度限流 | Redis `login:ip` / `login:user`，窗口与上限见 `AUTH_LOGIN_*` |
| 连续失败锁定 | `AUTH_LOGIN_LOCK_AFTER_FAILURES`（默认 5）次后锁定 `AUTH_LOGIN_LOCK_SECONDS`（默认 900s，可配 300–900） |
| 登录审计 | 表 `LoginEvent`：IP、User-Agent、deviceHint、成功/失败原因 |
| 统一错误文案 | 未知用户与密码错误均返回「用户名或密码错误」 |

## JWT

- Payload：`sub`、`username`、`role`、`jti`、`tv`（`User.tokenVersion`）
- **改密**：`tokenVersion` +1，旧 token 全部失效
- **登出**：`POST /auth/logout` 将当前 `jti` 加入 Redis 黑名单直至过期

## 管理员审计

- 带 `@AuditAction` 的请求写入 `audit` 通道
- `ADMIN` 角色额外写入 `type: admin_audit`、`severity: high`（含未标注的写操作）

## 环境变量

```env
AUTH_LOGIN_MAX_ATTEMPTS=10
AUTH_LOGIN_WINDOW_SECONDS=900
AUTH_LOGIN_LOCK_AFTER_FAILURES=5
AUTH_LOGIN_LOCK_SECONDS=900
```
