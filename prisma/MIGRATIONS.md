# 数据库迁移规范

本项目使用 **Prisma Migrate** 管理 schema，禁止在生产环境使用 `db push`。

## 环境对照

| 环境 | 命令 | 说明 |
|------|------|------|
| 本地开发 | `yarn prisma:migrate:dev` | 改 `schema.prisma` 后生成并应用迁移 |
| CI / 测试 | `yarn prisma:migrate:deploy` | 只应用已有迁移，不生成新文件 |
| **生产上线** | `yarn prisma:migrate:deploy:safe` | **先备份 MySQL**，再 `migrate deploy` |

## 开发流程

1. 修改 `prisma/schema.prisma`
2. 执行：

```bash
yarn prisma:validate
yarn prisma:migrate:dev --name describe_your_change
```

3. 检查 `prisma/migrations/<timestamp>_<name>/migration.sql`
4. 本地跑通：`yarn build && yarn test`

### 禁止事项

- **生产环境禁止** `yarn prisma:db:push`（脚本会在 `NODE_ENV=production` 时直接退出）
- 不要手改已合并到 `main` 的 migration 目录（应新建迁移修复）
- 不要用 `db push` 代替 `migrate dev` 提交迁移文件

## Migration 审核

合并含 `prisma/migrations/**` 的 PR 前：

```bash
yarn prisma:migrate:review          # 全量扫描
yarn prisma:migrate:review --git    # 仅相对 origin/main 的变更
yarn prisma:migrate:review --strict # 存在未确认风险则 exit 1
```

以下操作会标为 **high / critical**，需 DBA 或负责人确认后在对应迁移目录添加空文件：

```
prisma/migrations/<migration_name>/.reviewed
```

| 风险 | 典型 SQL |
|------|----------|
| critical | `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` |
| high | `ALTER … MODIFY` / `CHANGE`、新建 **唯一索引** |
| medium | `DELETE FROM`、`RENAME TABLE` |

CI 在 PR 上对迁移变更执行 `prisma:migrate:review --strict --git`。

## 生产部署

```bash
# 1. 确认环境变量（DATABASE_URL 等）
export NODE_ENV=production

# 2. 备份 + 应用迁移（推荐）
yarn prisma:migrate:deploy:safe

# 或分步：
./scripts/backup-mysql.sh
yarn prisma:migrate:deploy
```

部署前检查：

```bash
yarn prisma:migrate:status
yarn prisma:validate
```

## 回滚策略

Prisma **不提供**自动 down migration。生产回滚建议：

1. **应用回滚**：部署上一版本应用代码（schema 兼容时）
2. **数据库回滚**（破坏性迁移后）：
   - 从 `backups/*.sql.gz` 恢复到新库或临时库验证后切换
   - 或编写**新的 forward migration** 撤销变更（推荐，可审计）

```bash
# 恢复示例（务必在维护窗口、先停写流量）
gunzip -c backups/mib_server_YYYYMMDD_HHMMSS.sql.gz | mysql -h HOST -u USER -p DATABASE
```

### 迁移失败（`migrate deploy` 中断）

```bash
# 查看状态
yarn prisma:migrate:status

# 人工修复 DB 后标记已应用/已回滚（慎用，需 DBA）
npx prisma migrate resolve --applied "<migration_name>"
npx prisma migrate resolve --rolled-back "<migration_name>"
```

## 脚本一览

| 脚本 | 作用 |
|------|------|
| `prisma:migrate:dev` | 开发：创建并应用迁移 |
| `prisma:migrate:deploy` | 应用已有迁移 |
| `prisma:migrate:deploy:safe` | 生产：备份 + deploy |
| `prisma:db:push` | 仅本地原型（生产禁止） |
| `prisma:validate` | 校验 schema |
| `prisma:migrate:review` | 迁移 SQL 风险扫描 |
| `prisma:migrate:status` | 查看迁移状态 |

## 从 `db push` 迁到 migrate

若历史库由 `db push` 产生、无 `_prisma_migrations` 表：

1. 在**空库**上 `yarn prisma:migrate:deploy` 验证迁移链
2. 对已有库使用 [baseline](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining)：

```bash
npx prisma migrate resolve --applied "20250514120000_init"
# 对每个已存在于库的迁移执行 resolve
```

生产务必在备份后由 DBA 执行 baseline。

## 排课资源锁表（`ScheduleResourceLock`）

部署 `20250520140000_schedule_resource_lock` 后，对已有排课执行一次：

```bash
yarn prisma:backfill:schedule-locks
```
