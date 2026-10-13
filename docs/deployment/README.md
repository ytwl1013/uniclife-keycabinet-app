# 部署说明

部署模板位于 `deploy/`，仓库根目录的 `render.yaml` 定义 Render 免费 Web Service。PostgreSQL 使用已在 Render 创建的数据库，通过 Secret `DATABASE_URL` 连接；模板不会再创建第二个数据库。仓库不包含任何真实密钥。

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
- `ADMIN_API_TOKEN`：可选的服务端管理 API 令牌，至少 32 字符；本地 Backend 与 Admin 的 `ADMIN_API_TOKEN_DEV` 一致，Render 与 Admin 的 `ADMIN_API_TOKEN_PRO` 一致。只能由 Secret 注入，不得加 `NEXT_PUBLIC_` 前缀
- `AUTH_TOKEN_PEPPER`：至少 32 字符的独立随机密钥，用于会话、验证码和重置 Token 摘要；开发和生产环境都必填且不得随意轮换，否则全部会话与重置挑战会失效
- `AUTH_SESSION_TTL_DAYS`：非持久会话（当前为 Web）的有效天数，范围 1–90；移动端会话由客户端显式请求持久化，不按天过期，但仍可主动撤销
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

- `frontend/.env.example`：复制为被忽略的 `.env.local`，同时配置 dev/pro 两个 API 地址。
- `frontend/.env.development.example`：本地开发变量示例，将 dev API 地址改为开发电脑的局域网 IPv4 地址。
- `frontend/.env.production.example`：EAS production 环境的变量名和格式参考。

- `EXPO_PUBLIC_API_BASE_URL_DEV`：本地 Backend 的 API v1 基础地址
- `EXPO_PUBLIC_API_BASE_URL_PRO`：Render Backend 的 API v1 基础地址
- `EXPO_PUBLIC_APP_ENV`：`dev` 或 `pro`；本地只由 `pnpm dev:frontend` / `pnpm pro:frontend` 等显式启动命令设置，不写入 `.env.local`，EAS production 环境固定设置为 `pro`
- `EXPO_PUBLIC_EAS_PROJECT_ID`：EAS project UUID；仅在构建未自动注入 `extra.eas.projectId` 时作为系统推送注册的公开回退值
- `EXPO_PUBLIC_SUPPORT_EMAIL`：账户页“邮箱联系”展示和复制的公开客服邮箱地址

Expo 会把所有 `EXPO_PUBLIC_*` 值编译进客户端，因此这些变量不得包含密钥。pro 模式会强制 API Base URL 使用 HTTPS。不要使用 `NODE_ENV` 为 Expo 切换 API 环境；本地命令通过 `EXPO_PUBLIC_APP_ENV` 选择地址，EAS 构建使用 EAS production 环境中的 pro 变量。切换本地环境时必须先停止旧 Metro，再运行目标命令并完整重新加载客户端；仓库启动命令会清理 Metro 缓存。客户端普通 API 请求最长等待 20 秒；启动时的 session 恢复最多等待 4 秒。设备已有本地移动登录态时，超时或网络错误会直接进入应用并显示离线重试入口，只有后端明确返回 401 才删除本地会话；从未登录或已主动退出的设备仍进入登录页。

Android 直接分发、固定二维码和 EAS Update 的完整操作见
[`docs/android-release/README.md`](../android-release/README.md)。EAS production
环境必须配置 `EXPO_TOKEN`（仅放在 GitHub Actions Secret 或本地安全环境中），不能
写入仓库。

### 手机系统通知

客服回复和新增管理员横幅使用 `expo-notifications` 与 Expo Push Service；钥匙逾期由 App 根据已同步借用数据注册本机定时通知，因此网络中断后仍可按已知归还时间提醒。首次配置需执行 `eas init` 关联项目，并分别在 EAS Credentials 配置 iOS APNs push key 与 Android FCM v1；构建中必须能读取 EAS project ID。`app.json` 的通知 config plugin 变更只在重新生成原生二进制后生效，因此远程推送必须使用新的 development build 或生产 build 测试，不能使用 Expo Go；本机定时通知可在 Expo Go 中验证。推送令牌由 App 在用户授权后通过受鉴权 API 注册，服务端只向仍绑定有效登录会话的令牌发送；退出登录会移除当前会话令牌并取消尚未触发的逾期提醒。

系统推送只承担提醒作用，App 内数据库消息是权威记录。Expo Push API 请求设置 10 秒超时且不自动重试，避免不确定响应造成重复横幅；失败不会回滚客服回复。`DeviceNotRegistered` 令牌会被删除。发布前必须用真机分别验证前台、后台、终止状态、通知权限拒绝、横幅点击深链和角标清零。

## 管理后台环境变量

管理后台模板位于 `admin/.env.example`，复制为被 Git 忽略的 `admin/.env.local` 后配置：

- `APP_ENV`：`dev` 使用本地 Backend，`pro` 使用 Render Backend；通常由启动命令自动设置
- `API_BASE_URL_DEV`：本地 Fastify 地址，例如 `http://127.0.0.1:4000`
- `API_BASE_URL_PRO`：Render API 根地址，不附加 `/api/v1`；为避免管理令牌被窃听，代码强制要求 HTTPS
- `ADMIN_USERNAME`：单一初始管理员邮箱，仅在 Next.js 服务端读取
- `ADMIN_PASSWORD_HASH`：bcrypt cost 12 哈希；运行 `pnpm --filter @uniclife/admin generate-env-secrets` 交互输入并确认原始登录密码后生成，禁止在环境变量中保存明文密码
- `ADMIN_SESSION_SECRET`：至少 32 字符的独立随机值，用于签名 HttpOnly 管理会话
- `ADMIN_SESSION_TTL_HOURS`：管理会话时长，范围 1–24 小时，默认 8 小时
- `ADMIN_API_TOKEN_DEV`：Next.js 到本地 Fastify 的服务端令牌，必须与本地 Backend 的 `ADMIN_API_TOKEN` 一致
- `ADMIN_API_TOKEN_PRO`：Next.js 到 Render Fastify 的服务端令牌，必须与 Render 的 `ADMIN_API_TOKEN` 一致

`generate-env-secrets` 会同时生成密码哈希、随机会话密钥和两套随机管理 API Token，只输出到当前终端供手动复制，不会自动写入或覆盖任何 `.env`。管理员在登录页输入原始密码，服务端负责与哈希校验。旧的单一 `ADMIN_API_TOKEN` 仅作为现有本地配置的兼容回退值，新配置应使用 DEV/PRO 两个变量。

浏览器只访问 Next.js 同源路由，API Base URL 与管理 API Token 都不会进入客户端 bundle。生产部署还应在入口网关增加跨实例登录限流、TLS/HSTS 和可信代理头配置；应用内存限流只作为单实例的基础保护。

## Render 后端与数据库

根目录的 `render.yaml` 创建以下资源：

- `uniclife-keycabinet-api`：Virginia 区域的免费 Node.js Web Service，跟踪 GitHub `main` 分支，并等待 GitHub Actions 检查通过后自动部署。

数据库继续使用已经在 Render 创建的 PostgreSQL。建议数据库与 Web Service 位于同一区域，并使用 Render 提供的 Internal Database URL，避免公网连接和跨区延迟。

仓库保持根目录作为构建目录，以便使用 workspace lockfile。免费 Web Service 不支持 Pre-Deploy Command，因此数据库迁移包含在 Build Command 的最后一步；迁移失败会使整个部署失败：

```text
Build Command:      pnpm install --frozen-lockfile && pnpm --filter @uniclife/backend build && pnpm --filter @uniclife/backend db:migrate
Start Command:      pnpm --filter @uniclife/backend start
Health Check Path:  /api/v1/health
```

升级到付费 Web Service 后，应把 `db:migrate` 从 Build Command 移到 `preDeployCommand`，使迁移与构建职责分离。健康检查会执行轻量数据库查询，数据库不可用时不会返回成功。

### 首次部署步骤

1. 在 Render 中确认已创建的 PostgreSQL 可用，并复制它的 **Internal Database URL**。不要把连接串写入仓库、Issue、Pull Request 或日志。
2. 将部署改动通过 GitHub Pull Request 依次合入 `dev` 和 `main`，确认 `CI / check` 通过，禁止直接推送这两个分支。
3. 在 Render Dashboard 选择 **New > Blueprint**，关联 GitHub 仓库 `ytwl1013/uniclife-keycabinet-app` 和根目录 `render.yaml`。若已有同名 Web Service，应更新现有服务而不是再创建一个重复服务。
4. Blueprint 首次创建时填写 `DATABASE_URL` 和 `FRONTEND_ORIGIN`。`DATABASE_URL` 使用第 1 步的内部连接串；`FRONTEND_ORIGIN` 只填写允许使用浏览器访问 API 的 HTTPS Origin。
5. 确认服务的 Repository Branch 为 `main`，Auto-Deploy 为 **After CI Checks Pass**。
6. 等待迁移和 API 部署完成，再访问 `https://<service>.onrender.com/api/v1/health`。成功响应必须为 `code: "OK"`。
7. 将最终 API 地址加上 `/api/v1`，写入 EAS production 环境的 `EXPO_PUBLIC_API_BASE_URL_PRO`，同时设置 `EXPO_PUBLIC_APP_ENV=pro`，然后重新构建移动端。
8. 本地部署 Admin 时把 `API_BASE_URL_PRO` 指向该 API 根地址（不要附加 `/api/v1`），并确保 Admin 的 `ADMIN_API_TOKEN_PRO` 与 Render 的 `ADMIN_API_TOKEN` 完全一致；管理员登录密钥只放被忽略的本地环境文件。
9. 登录 Admin 的“产品与二维码”，创建生产 SKU、上传图片并下载印刷文件。生产环境不要执行 `db:seed:dev`。

`AUTH_TOKEN_PEPPER` 和 `ADMIN_API_TOKEN` 由 Render 首次创建时生成。`DATABASE_URL` 作为 Render Secret 手动注入，不会同步回仓库。生产数据库不运行开发 seed。

### 免费层限制与用途

截至 2026-09-02，Render 免费 Web Service 为 0.1 CPU / 512 MB；闲置 15 分钟后休眠，下一次 HTTP 或 WebSocket 连接的冷启动约需一分钟；每个 workspace 每月共享 750 个免费实例小时。免费 PostgreSQL 为 0.1 CPU / 256 MB、最多 100 个直连、1 GB 存储，但创建 30 天后过期，14 天宽限期后会删除，而且没有备份和托管连接池。免费 Web Service 还会阻止 25、465、587 端口的 SMTP 出站连接。

因此免费组合只用于演示和短期内测，不承载真实钥匙、借用、人员或审计生产数据。当前模板把数据库连接池限制为 5，并把 `UV_THREADPOOL_SIZE` 设为 2，以降低突发登录密码计算和数据库连接对小实例的资源压力。反馈 SMTP 与密码重置通知在免费 Render 上不能按当前端口方案投入生产；正式发布前应改为 HTTPS 邮件 API 或使用允许的外部通知适配器。

产品图片的缩放、方向处理、WebP 编码、压缩和元数据清除全部发生在 Admin 浏览器，Render 后端不会处理原图；后端单次只接收并校验最多 700 KiB 的 WebP。数据库把图片放在独立表中，产品列表不会读取图片二进制。该设计适合当前 SKU 数量较少的场景，也可降低免费 CPU、内存和查询带宽占用。

在“普通查询为主、每个活跃用户平均每分钟 1–3 次 API 请求、低频领取/归还写入”的假设下，可把免费层的保守试运行目标设为：10–30 个同时活跃用户、100–300 DAU、1,000–5,000 个轻度注册账户。它不是容量承诺；上线前需用目标区域、真实数据量和完整登录/柜体/领取流程做压测。注册账户的磁盘理论上还能更多，但 30 天过期、无备份、0.1 CPU 和审计事件持续增长会先成为实际限制。

反向代理和负载均衡器必须允许 `/api/v1/realtime` 的 WebSocket Upgrade，空闲超时必须大于 45 秒心跳周期，并对 `Authorization`、`Cookie` 和 `Sec-WebSocket-Protocol` 请求头禁用访问日志或执行整体脱敏。当前实时 Hub 是进程内实现，生产只能运行单个 API 实例；启用多实例前必须接入跨实例 Pub/Sub，否则不同实例上的客户端不会收到彼此的变更通知。

## 生产数据驻留要求

生产环境的 API、数据库、应用日志、对象存储和所有灾备副本必须部署并存储在美国境内。禁止将生产数据、日志、附件、备份或灾备副本跨境复制到美国以外区域。

本仓库当前不提供云厂商生产模板，也不在运行时自动校验区域。正式部署前必须由基础设施和安全负责人验证所有主区域、只读副本、日志接收端、对象存储复制规则、备份保管库及灾难恢复目标均位于美国境内，并将验证结果纳入发布检查清单。

## iOS TestFlight 更新

`frontend/eas.json` 的 production 构建使用 EAS production 环境，远端自动递增
buildNumber。production 提交配置中的 `ascAppId` 指向现有 UnicLife 应用，属于
公开应用标识；Apple 签名和 App Store Connect API Key 仍由 EAS 凭据服务管理。

在前端目录完成 lint、typecheck、test、Expo Doctor 与 iOS export 后运行：

```bash
pnpm dlx eas-cli@latest build --platform ios --profile production --auto-submit
```

若构建成功但提交配置有误，修复配置后针对同一个 build ID 运行：

```bash
pnpm dlx eas-cli@latest submit --platform ios --profile production --id <build-id>
```

无需重复消耗构建号和构建额度。提交完成后到 App Store Connect → UnicLife →
TestFlight 确认 Apple 处理结果，先验证内部测试，再处理外部测试审核。新构建不会
自动解决前一版的审核拒绝意见。

SDK 57 测试重点：安装后的钥匙柜图标、首次允许相机后扫码、在系统设置允许相机后
返回 App、首次允许联网和断网重连后的数据恢复，以及注册前查看协议再返回表单。
图标来自 `frontend/src/assets/images/keycabinet_app_logo.png`，原生资源更新必须安装新构建。

## Android APK 直接安装包

`frontend/eas.json` 的 `apk` profile 继承 production 的环境、Node/pnpm 版本和
自动递增版本号配置，使用 `distribution: internal` 与 `android.buildType: apk`
生成可直接安装的 release APK。该安装包连接生产 API，包含 JavaScript 资源，
无需 Expo Go 或本地 Metro。Android 签名由 EAS 凭据服务管理。

在 `frontend/` 运行：

```bash
pnpm dlx eas-cli@latest build --platform android --profile apk
```

构建成功后从 EAS 构建详情页下载 APK，在 Android 手机上打开安装。
该流程只生成直接分发的安装包，不运行 EAS Submit，也不提交 Google Play。
后续更新应沿用相同包名与签名并递增 versionCode，以支持覆盖安装。
