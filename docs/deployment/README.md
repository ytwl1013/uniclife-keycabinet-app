# 部署说明

部署模板位于 `deploy/`，仓库根目录的 `render.yaml` 定义 Render 免费 Web Service 与 PostgreSQL Blueprint。模板不包含任何真实密钥；只有在 Render Dashboard 中关联仓库并确认 Blueprint 后才会创建云资源。

## 后端环境变量

后端通用变量参考 `backend/.env.example`，环境模板分别为：

- `backend/.env.development.example`：本地 Fastify + Docker PostgreSQL。
- `backend/.env.production.example`：Render 变量名和格式参考，不包含真实值。

运行时先读取操作系统或云平台注入的变量，再按 `NODE_ENV` 尝试读取 `.env.<environment>.local`、`.env.<environment>`、`.env.local` 和 `.env`。已存在的变量不会被文件覆盖。

- `DATABASE_URL`：PostgreSQL 连接串，占位格式，不提交真实值
- `DB_POOL_MAX`：单个后端实例的数据库连接池上限，范围 1–50；Render 免费数据库建议为 5
- `PORT`：后端监听端口
- `HOST`：后端监听地址
- `LOG_LEVEL`：日志级别
- `FRONTEND_ORIGIN`：允许跨域访问的前端地址
- `ADMIN_API_TOKEN`：可选的服务端管理 API 令牌，至少 32 字符；启用管理后台时必填，并与管理后台同名变量保持一致。只能由 Secret 注入，不得加 `NEXT_PUBLIC_` 前缀
- `AUTH_TOKEN_PEPPER`：至少 32 字符的独立随机密钥，用于会话、验证码和重置 Token 摘要；开发和生产环境都必填且不得随意轮换，否则全部会话与重置挑战会失效
- `AUTH_SESSION_TTL_DAYS`：会话有效天数，范围 1–90
- `AUTH_RESET_TTL_MINUTES`：验证码和重置 Token 有效分钟数，范围 5–60
- `AUTH_ALLOW_RESET_CODE_PREVIEW`：仅本地开发可设为 `true`；生产环境设为 `true` 会导致启动失败
- `MAIL_SERVER`、`MAIL_PORT`：反馈邮件 SMTP 主机与端口
- `MAIL_USE_SSL`、`MAIL_USE_TLS`：SMTP 连接安全开关；465 端口通常使用 SSL，提交前以邮件服务商要求为准
- `MAIL_USERNAME`、`MAIL_PASSWORD`：SMTP 登录账号与密码/应用专用密码；密码只能由本地忽略文件或 Render Secret 注入
- `MAIL_SENDER_NAME`：邮件中显示的发件人名称；发件邮箱头和 SMTP `MAIL FROM` 会强制使用 `MAIL_USERNAME`，兼容要求发件地址与认证账号一致的企业邮箱
- `MAIL_SENDER`：兼容旧配置保留，反馈邮件不会用它覆盖认证账号地址
- `MAIL_FEEDBACK_TO`：反馈收件邮箱；未设置时默认投递到 `MAIL_USERNAME`，支持同一账号自己发给自己
- `MAIL_TIMEOUT`：SMTP 连接、问候及 Socket 超时秒数，范围 1–120

开发和生产启动方式：

- 开发：`NODE_ENV=development`，由 `pnpm dev:backend` 自动设置。
- 生产：`NODE_ENV=production`，由 `pnpm --filter @uniclife/backend start` 自动设置；`DATABASE_URL`、`PORT` 等真实值由 Render 注入。

除测试环境外，缺少 `DATABASE_URL` 时后端会拒绝启动，避免线上服务在未连接数据库的情况下误运行。
生产环境缺少 `AUTH_TOKEN_PEPPER` 时同样拒绝启动。默认密码重置通知适配器不会发送邮件；发布前必须注入真实 `PasswordResetNotifier`，并确认邮件服务、退信处理、速率限制和数据驻留要求。

反馈邮件只有在 `MAIL_SERVER`、`MAIL_USERNAME`、`MAIL_PASSWORD` 三项全部配置后启用；只配置其中一部分会导致启动配置校验失败。反馈正文和附件可能包含用户提交的数据，邮件服务商、邮箱存储与备份也必须满足下述生产数据驻留要求。不得把真实 SMTP 密码写入任何已跟踪文件。

## 前端环境变量

前端通用变量参考 `frontend/.env.example`，环境模板分别为：

- `frontend/.env.development.example`：复制为被忽略的 `.env.local`，将 API 地址改为开发电脑的局域网 IPv4 地址。
- `frontend/.env.production.example`：EAS production 环境的变量名和格式参考。

- `EXPO_PUBLIC_API_BASE_URL`：后端 API v1 基础地址
- `EXPO_PUBLIC_APP_ENV`：`development` 或 `production`
- `EXPO_PUBLIC_SUPPORT_EMAIL`：账户页“邮箱联系”展示和复制的公开客服邮箱地址

Expo 会把所有 `EXPO_PUBLIC_*` 值编译进客户端，因此这些变量不得包含密钥。生产模式会强制 API Base URL 使用 HTTPS。不要使用 `NODE_ENV` 为 Expo 切换 API 环境；本地使用 `.env.local`，EAS 构建使用 EAS 对应环境。

## 管理后台环境变量

管理后台模板位于 `admin/.env.example`，复制为被 Git 忽略的 `admin/.env.local` 后配置：

- `APP_ENV`：`development` 使用本地地址，`dev` 使用远端开发服务器地址
- `API_BASE_URL_DEVELOPMENT`：本地 Fastify 地址，例如 `http://127.0.0.1:4000`
- `API_BASE_URL_DEV`：远端 Dev API 地址；为避免管理令牌被窃听，代码强制要求 HTTPS
- `ADMIN_USERNAME`：单一初始管理员邮箱，仅在 Next.js 服务端读取
- `ADMIN_PASSWORD_HASH`：bcrypt cost 12 哈希；运行 `pnpm --filter @uniclife/admin generate-env-secrets` 交互输入并确认原始登录密码后生成，禁止在环境变量中保存明文密码
- `ADMIN_SESSION_SECRET`：至少 32 字符的独立随机值，用于签名 HttpOnly 管理会话
- `ADMIN_SESSION_TTL_HOURS`：管理会话时长，范围 1–24 小时，默认 8 小时
- `ADMIN_API_TOKEN`：Next.js 到 Fastify 的服务端令牌，必须与后端配置一致

`generate-env-secrets` 会同时生成密码哈希、随机会话密钥和随机管理 API Token，只输出到当前终端供手动复制，不会自动写入或覆盖任何 `.env`。管理员在登录页输入原始密码，服务端负责与哈希校验。

浏览器只访问 Next.js 同源路由，API Base URL 与 `ADMIN_API_TOKEN` 都不会进入客户端 bundle。生产部署还应在入口网关增加跨实例登录限流、TLS/HSTS 和可信代理头配置；应用内存限流只作为单实例的基础保护。

## Render 后端与数据库

根目录的 `render.yaml` 创建以下同区资源：

- `uniclife-keycabinet-api`：Virginia 区域的免费 Node.js Web Service，跟踪 `dev` 分支。
- `uniclife-keycabinet-db`：Virginia 区域的免费 PostgreSQL 17，外部 IP 白名单为空，只允许 Render 内部连接。

仓库保持根目录作为构建目录，以便使用 workspace lockfile。免费 Web Service 不支持 Pre-Deploy Command，因此数据库迁移包含在 Build Command 的最后一步；迁移失败会使整个部署失败：

```text
Build Command:      pnpm install --frozen-lockfile && pnpm --filter @uniclife/backend build && pnpm --filter @uniclife/backend db:migrate
Start Command:      pnpm --filter @uniclife/backend start
Health Check Path:  /api/v1/health
```

升级到付费 Web Service 后，应把 `db:migrate` 从 Build Command 移到 `preDeployCommand`，使迁移与构建职责分离。健康检查会执行轻量数据库查询，数据库不可用时不会返回成功。

### 首次部署步骤

1. 先把 `dev` 分支镜像到 Render 支持的 GitHub、`gitlab.com` 或 Bitbucket。当前 `origin` 是自建 `gitlab.uniclife.cn`；Render 的 GitLab OAuth 集成不能直接读取该私有仓库。另一条可选路线是在 GitLab CI 构建镜像并让 Render 从 GitLab Container Registry 拉取，但该路线不能直接使用本 Blueprint 的 Git 构建定义。
2. 将本次部署改动通过 Merge Request 合入 `dev`，确认 GitLab CI 和 Codex review 通过，禁止直接推送 `dev`。
3. 在 Render Dashboard 选择 **New > Blueprint**，关联镜像仓库和根目录 `render.yaml`。
4. Blueprint 首次创建时填写 `FRONTEND_ORIGIN`。这里只填写允许使用浏览器访问 API 的 HTTPS Origin；不要填写 Token、Cookie 或数据库地址。
5. 确认 Blueprint 后等待数据库、迁移和 API 部署完成，再访问 `https://<service>.onrender.com/api/v1/health`。成功响应必须为 `code: "OK"`。
6. 将最终 API 地址加上 `/api/v1`，写入 EAS production 环境的 `EXPO_PUBLIC_API_BASE_URL` 后重新构建移动端。

`AUTH_TOKEN_PEPPER` 和 `ADMIN_API_TOKEN` 由 Render 首次创建时生成。`DATABASE_URL` 自动引用同区数据库内部连接串。生产数据库不运行开发 seed。

### 免费层限制与用途

截至 2026-09-02，Render 免费 Web Service 为 0.1 CPU / 512 MB；闲置 15 分钟后休眠，下一次 HTTP 或 WebSocket 连接的冷启动约需一分钟；每个 workspace 每月共享 750 个免费实例小时。免费 PostgreSQL 为 0.1 CPU / 256 MB、最多 100 个直连、1 GB 存储，但创建 30 天后过期，14 天宽限期后会删除，而且没有备份和托管连接池。免费 Web Service 还会阻止 25、465、587 端口的 SMTP 出站连接。

因此免费组合只用于演示和短期内测，不承载真实钥匙、借用、人员或审计生产数据。当前模板把数据库连接池限制为 5，并把 `UV_THREADPOOL_SIZE` 设为 2，以降低突发登录密码计算和数据库连接对小实例的资源压力。反馈 SMTP 与密码重置通知在免费 Render 上不能按当前端口方案投入生产；正式发布前应改为 HTTPS 邮件 API 或使用允许的外部通知适配器。

在“普通查询为主、每个活跃用户平均每分钟 1–3 次 API 请求、低频领取/归还写入”的假设下，可把免费层的保守试运行目标设为：10–30 个同时活跃用户、100–300 DAU、1,000–5,000 个轻度注册账户。它不是容量承诺；上线前需用目标区域、真实数据量和完整登录/柜体/领取流程做压测。注册账户的磁盘理论上还能更多，但 30 天过期、无备份、0.1 CPU 和审计事件持续增长会先成为实际限制。

反向代理和负载均衡器必须允许 `/api/v1/realtime` 的 WebSocket Upgrade，空闲超时必须大于 45 秒心跳周期，并对 `Authorization`、`Cookie` 和 `Sec-WebSocket-Protocol` 请求头禁用访问日志或执行整体脱敏。当前实时 Hub 是进程内实现，生产只能运行单个 API 实例；启用多实例前必须接入跨实例 Pub/Sub，否则不同实例上的客户端不会收到彼此的变更通知。

## 生产数据驻留要求

生产环境的 API、数据库、应用日志、对象存储和所有灾备副本必须部署并存储在美国境内。禁止将生产数据、日志、附件、备份或灾备副本跨境复制到美国以外区域。

本仓库当前不提供云厂商生产模板，也不在运行时自动校验区域。正式部署前必须由基础设施和安全负责人验证所有主区域、只读副本、日志接收端、对象存储复制规则、备份保管库及灾难恢复目标均位于美国境内，并将验证结果纳入发布检查清单。
