# 数据库说明

后端使用 Drizzle ORM 管理 PostgreSQL schema。schema 定义位于 `backend/src/db/schema.ts`，迁移文件输出目录为 `backend/src/db/migrations`。

## 当前规划表

- `users`：用户与人员编号
- `cabinets`：钥匙柜主数据和设备状态
- `keys`：钥匙、柜体、槽位和状态
- `records`：领取、归还、盘点、异常开柜等业务记录
- `audit_logs`：关键动作审计日志

## 迁移要求

新增或修改表结构时必须说明用途、索引、约束、回滚策略和兼容影响。生成迁移前确认 `DATABASE_URL` 指向本地或测试库，不得使用生产库。

## 本地 PostgreSQL

`deploy/docker/compose.dev.yml` 只启动 PostgreSQL，不容器化后端。数据库端口仅绑定开发电脑的 `127.0.0.1`，并使用仅限本地开发容器的 trust 认证；该模式禁止用于共享、测试或生产服务器。

```bash
pnpm dev:db
pnpm db:migrate:dev
```

本地连接信息位于被 Git 忽略的 `backend/.env.development`。首次使用时从 `backend/.env.development.example` 复制。

## 初始迁移

`0000_initial_schema.sql` 创建四个状态枚举以及 `users`、`cabinets`、`keys`、`records`、`audit_logs` 五张表。`records.actor_id` 和 `audit_logs.actor_id` 使用普通整数外键引用 `users.id`，删除用户受到限制，以免关键业务记录和审计记录失去操作者关联。

- 兼容影响：这是初始迁移，不迁移已有生产数据。
- 本地回滚：确认无需保留开发数据后，删除 Compose volume，再重新启动数据库并执行迁移。删除 volume 会永久清除本地开发数据，因此不提供自动 reset 命令。
- 生产回滚：优先恢复部署前备份或编写前向修复迁移；不得直接删除审计和业务记录表。
