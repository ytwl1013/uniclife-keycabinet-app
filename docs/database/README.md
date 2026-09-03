# 数据库说明

后端使用 Drizzle ORM 管理 PostgreSQL。Schema 位于 `backend/src/db/schema.ts`，初始迁移是 `backend/src/db/migrations/0000_backend_foundation.sql`。

## 表与职责

| 表 | 用途 | 关键约束/索引 |
| --- | --- | --- |
| `users` | 账户、密码哈希、语言、登录统计和首页导航提示状态 | 小写邮箱唯一；登录次数非负；账户删除采用匿名化和软停用 |
| `sessions` | 不透明会话 Token 摘要 | Token 摘要唯一；按用户和过期时间索引 |
| `push_tokens` | 手机系统通知的 Expo 推送令牌 | 令牌唯一；绑定用户和有效会话；按用户更新时间及会话索引 |
| `password_reset_challenges` | 验证码尝试、短时重置 Token 和消费状态 | 重置 Token 摘要唯一；尝试次数非负 |
| `consents` | 条款和隐私版本同意 | 用户 + 类型 + 政策版本唯一 |
| `product_skus` | 产品型号、槽位容量和资料/图片版本 | SKU 唯一；容量大于 0；版本非负 |
| `product_sku_images` | Admin 浏览器预处理后的产品 WebP 二进制与摘要 | 每个 SKU 最多一张；不超过 700 KiB；尺寸不超过 1280px；删除 SKU 时级联删除 |
| `cabinet_qrs` | 旧版每设备二维码，仅为迁移兼容保留 | code 和旧 device UUID 唯一；新流程不再读取 |
| `product_qrs` | 同一 SKU 批量印刷的产品初始化码 | code 唯一；每个 SKU 一个有效模板 |
| `cabinets` | 应用内柜体实例、状态和并发版本 | 服务端实例 UUID 唯一；version 非负 |
| `cabinet_memberships` | 用户与柜体的超级管理员/管理员关系 | 柜体 + 用户唯一；有效超级管理员按柜体部分唯一；保留移除时间 |
| `cabinet_join_invitations` | 设置页生成的一次性加入码摘要 | Token 摘要唯一；记录十分钟过期、使用和撤销状态 |
| `key_slots` | 柜体固定位置 | 柜体 + position 唯一；position 大于 0 |
| `keys` | 当前钥匙资料和槽位 | slot 唯一，保证一个槽位最多一把钥匙 |
| `loans` | 领取与归还记录 | 每把钥匙最多一条 active 记录；预计归还晚于领取 |
| `cabinet_events` | 页面活动时间线的不可变业务事件 | 按柜体/钥匙和发生时间索引 |
| `feedback_records` | 反馈主题、用户身份快照、初始邮件状态和会话状态 | 按用户/投递状态/会话状态和消息时间索引；图片数量限制 0–5 |
| `feedback_messages` | 用户与客服的双向消息、已读和邮件投递状态 | 按反馈与时间索引；客服未读部分索引；正文 1–5000 字；发送方与用户外键一致性约束 |
| `idempotency_records` | 写请求幂等响应 | 操作者 + 操作 + requestId 复合主键 |
| `audit_logs` | 成功和失败操作审计 | 按操作者、目标和时间索引 |

`loans.key_id` 与 `cabinet_events.key_id` 有意不设当前钥匙外键：钥匙资料永久删除后仍必须保留历史 ID 和追责记录。批量删除会先把相关有效借用标记为 `cancelled`。用户、柜体、成员和审计的主体外键使用 restrict，避免日常操作意外级联删除；只有经过超级管理员鉴权、版本校验和二次确认的整箱删除流程会在单一事务内按依赖顺序显式清理。

`users.login_count` 和 `users.last_login_at` 只统计迁移上线后的成功认证；注册并自动创建会话计为第一次登录。`users.home_guide_prompted_at` 独立记录用户是否已经处理过首页的“进入使用导航？”选择，不能使用登录次数代替该 UI 状态。上述登录元数据只通过当前账户接口返回，不进入成员或活动参与者视图。

`feedback_records` 在 SMTP 调用前与首条 `feedback_messages` 消息原子写入，投递完成后两处状态更新为 `sent` 或 `failed`。表中保留提交时的用户名和邮箱快照，保证后续查询与回复可追溯；保存称呼、类型、标题、正文和图片数量，但不保存图片 Base64 或附件文件。后续回复只写 `feedback_messages`，并更新根记录的会话状态与最后消息时间。本人查询、已读和回复都使用 `user_id` 在 SQL 层校验归属，不能仅依赖客户端传参。

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
- `0001_peaceful_darkstar.sql` 新增登录次数、最近登录时间和首页导航提示时间。既有账户的导航提示时间在迁移时回填，避免上线后误弹；既有账户的历史登录次数无法还原，因此从 0 开始累计，最近登录时间在下一次成功登录后写入。回滚时优先以前向迁移停止读写这些字段；若必须删除列，应先部署不再依赖这些字段的应用版本，再删除约束和三列。
- `0002_funny_stellaris.sql` 新增 `feedback_delivery_status` 与 `feedback_records`。迁移不回填此前只存在于邮箱或审计日志中的反馈；上线后记录从空列表开始。回滚应先部署不再调用反馈历史接口、且提交不再写记录的版本，再备份并删除表和枚举；直接回滚会永久丢失发送历史文字和状态。
- `0003_glamorous_skin.sql` 新增按 SKU 复用的 `product_qrs`、一次性 `cabinet_join_invitations`，以及 `cabinet_initialized`、`member_joined` 事件类型。迁移保留旧柜体、成员和 `cabinet_qrs` 数据，不允许旧设备二维码继续新增成员。回滚前必须先部署仍支持旧绑定接口的应用版本；PostgreSQL 枚举值不能安全原位删除，因此回滚优先停止写入新类型并保留表结构，确需移除时应新建枚举并迁移现有事件。
- `0004_plain_slipstream.sql` 以新枚举替换成员角色枚举并加入 `super_admin`，同时新增 `super_admin_transferred` 事件类型。`0005_futuristic_bruce_banner.sql` 按 `joined_at, id` 把每个箱子最早的有效成员提升为超级管理员，再创建有效超级管理员部分唯一索引；没有有效成员的历史箱子不会自动创建绑定。角色枚举采用替换方式，是为了让同一次 PostgreSQL 迁移事务可以立即使用新值。回滚应先部署不再写入或判断超级管理员的版本，再移除部分唯一索引，并把所有 `super_admin` 降为 `admin`；PostgreSQL 枚举值不能安全原位删除，需新建旧枚举并迁移列和事件，不能直接改写已执行迁移。
- `0006_rare_wither.sql` 新增客服会话枚举、`feedback_messages`、根记录会话状态与最后消息时间，并把每条既有反馈回填为一条用户首消息。回滚前必须先部署只读取旧发送记录的版本并备份客服消息；随后才能删除消息表和新列。直接回滚会永久丢失所有后续客服/用户回复，PostgreSQL 枚举应在确认无列依赖后再删除。
- `0007_brave_gorilla_man.sql` 新增 `push_tokens`，把 Expo 推送令牌绑定到用户和登录会话。同一令牌唯一，退出当前会话会删除对应记录，发送时也只读取未撤销且未过期的会话。回滚前先部署不再注册或发送系统推送的版本，再删除该表；回滚只会停止手机横幅和角标，不影响 App 内客服消息与已读记录。
- `0008_flimsy_power_man.sql` 为 `product_skus` 新增资料版本、图片版本和更新时间，并新增独立的 `product_sku_images` 表。图片与常规产品查询分表，只有图片端点读取 `bytea`；Admin 上传的 WebP 最大 700 KiB，因此少量 SKU 不会给免费数据库造成运行时图片处理负担。回滚前必须先部署不再读取 `imagePath`、不再调用产品管理写接口的版本并备份产品图片；随后才能删除图片表和三个新列。删除图片表会永久丢失上传图片，但不会改变既有 SKU、产品二维码或柜体。

## 开发种子

`pnpm db:seed:dev` 幂等写入两个虚构 SKU 和每个 SKU 一个可复用产品初始化码，供“同码创建多个柜体”流程验证。它不创建用户、不写真实设备凭据，并在 `NODE_ENV=production` 下拒绝运行。

生产环境不使用 seed。迁移完成后，由管理员通过 Admin 新建真实 SKU、上传已在浏览器预处理的图片并下载产品二维码。SKU 和二维码不提供修改/删除操作，避免已经印刷的码失效；展示资料可以继续更新。

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
