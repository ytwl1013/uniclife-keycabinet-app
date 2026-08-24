# 数据库说明

后端使用 Drizzle ORM 管理 PostgreSQL。Schema 位于 `backend/src/db/schema.ts`，初始迁移是 `backend/src/db/migrations/0000_backend_foundation.sql`。

## 表与职责

| 表 | 用途 | 关键约束/索引 |
| --- | --- | --- |
| `users` | 账户、密码哈希、语言和停用状态 | 小写邮箱唯一；账户删除采用匿名化和软停用 |
| `sessions` | 不透明会话 Token 摘要 | Token 摘要唯一；按用户和过期时间索引 |
| `password_reset_challenges` | 验证码尝试、短时重置 Token 和消费状态 | 重置 Token 摘要唯一；尝试次数非负 |
| `consents` | 条款和隐私版本同意 | 用户 + 类型 + 政策版本唯一 |
| `product_skus` | 产品型号和槽位容量 | SKU 唯一；容量大于 0 |
| `cabinet_qrs` | SKU 与实体设备 UUID 的二维码身份 | code 和 device UUID 唯一 |
| `cabinets` | 柜体资料、在线状态和并发版本 | device UUID 唯一；version 非负 |
| `cabinet_memberships` | 用户与柜体的管理员关系 | 柜体 + 用户唯一；保留移除时间 |
| `key_slots` | 柜体固定位置 | 柜体 + position 唯一；position 大于 0 |
| `keys` | 当前钥匙资料和槽位 | slot 唯一，保证一个槽位最多一把钥匙 |
| `loans` | 领取与归还记录 | 每把钥匙最多一条 active 记录；预计归还晚于领取 |
| `cabinet_events` | 页面活动时间线的不可变业务事件 | 按柜体/钥匙和发生时间索引 |
| `idempotency_records` | 写请求幂等响应 | 操作者 + 操作 + requestId 复合主键 |
| `audit_logs` | 成功和失败操作审计 | 按操作者、目标和时间索引 |

`loans.key_id` 与 `cabinet_events.key_id` 有意不设当前钥匙外键：钥匙资料永久删除后仍必须保留历史 ID 和追责记录。批量删除会先把相关有效借用标记为 `cancelled`。用户、柜体、成员和审计的主体外键使用 restrict，避免历史链路被级联删除。

## 迁移、兼容与回滚

本仓库仍处于初始化阶段，本次基础后端用新的 `0000_backend_foundation.sql` 替换了此前未承载生产数据的占位初始迁移，旧表结构不做原位升级。

- 已执行旧占位迁移的本地开发库不兼容。确认本地数据无需保留后，可执行下列命令重新初始化。删除 volume 会永久删除本地数据，因此仓库不提供自动 reset 命令，也不要在未备份的环境执行。

```bash
pnpm dev:db:down
docker volume rm uniclife-keycabinet-dev_keycabinet_pg_data
pnpm dev:db
pnpm db:migrate:dev
pnpm db:seed:dev
```
- 新环境直接执行 `pnpm db:migrate:dev`。
- 生产环境上线前必须备份；生产回滚优先恢复备份或编写前向修复迁移，不得直接删除借用、事件或审计表。
- 后续任何 schema 变化必须新增迁移，不能继续重写 `0000`。

## 开发种子

`pnpm db:seed:dev` 幂等写入两个虚构 SKU 和两个未绑定二维码，供扫描绑定流程验证。它不创建用户、不写真实设备凭据，并在 `NODE_ENV=production` 下拒绝运行。

## 从本机数据库工具连接 Docker PostgreSQL

开发 Compose 将 PostgreSQL 映射到本机回环地址。DataGrip、DBeaver 等本机工具使用以下参数：

| 字段 | 值 |
| --- | --- |
| Host | `localhost` 或 `127.0.0.1` |
| Port | `5432` |
| Database | `keycabinet_dev` |
| Username | `keycabinet_dev` |
| Password | 留空；本地 Compose 使用 `POSTGRES_HOST_AUTH_METHOD=trust` |
| JDBC URL | `jdbc:postgresql://localhost:5432/keycabinet_dev` |

截图中若填写 `postgres` 用户会连接失败，因为开发容器创建的管理员用户是 `keycabinet_dev`。从另一个 Compose 容器连接时 Host 才使用服务名 `postgres`，端口仍为 `5432`。

连接前可确认容器状态，并直接进入数据库验证：

```bash
docker compose -f deploy/docker/compose.dev.yml ps
docker compose -f deploy/docker/compose.dev.yml exec postgres \
  psql -U keycabinet_dev -d keycabinet_dev
```

停止容器不会删除数据；数据保存在 `keycabinet_pg_data` volume。不要把本地 `trust` 认证复制到生产环境。
