# 部署说明

部署模板位于 `deploy/`。当前提供本地 PostgreSQL Docker Compose 和 Render 部署前置约定，不包含任何真实密钥，也暂不包含会创建生产资源的 `render.yaml`。

## 后端环境变量

后端通用变量参考 `backend/.env.example`，环境模板分别为：

- `backend/.env.development.example`：本地 Fastify + Docker PostgreSQL。
- `backend/.env.production.example`：Render 变量名和格式参考，不包含真实值。

运行时先读取操作系统或云平台注入的变量，再按 `NODE_ENV` 尝试读取 `.env.<environment>.local`、`.env.<environment>`、`.env.local` 和 `.env`。已存在的变量不会被文件覆盖。

- `DATABASE_URL`：PostgreSQL 连接串，占位格式，不提交真实值
- `PORT`：后端监听端口
- `HOST`：后端监听地址
- `LOG_LEVEL`：日志级别
- `FRONTEND_ORIGIN`：允许跨域访问的前端地址
- `AUTH_TOKEN_PEPPER`：至少 32 字符的独立随机密钥，用于会话、验证码和重置 Token 摘要；生产环境必填且不得轮换，除非计划让全部会话与重置挑战失效
- `AUTH_SESSION_TTL_DAYS`：会话有效天数，范围 1–90
- `AUTH_RESET_TTL_MINUTES`：验证码和重置 Token 有效分钟数，范围 5–60
- `AUTH_ALLOW_RESET_CODE_PREVIEW`：仅本地开发可设为 `true`；生产环境设为 `true` 会导致启动失败

开发和生产启动方式：

- 开发：`NODE_ENV=development`，由 `pnpm dev:backend` 自动设置。
- 生产：`NODE_ENV=production`，由 `pnpm --filter @uniclife/backend start` 自动设置；`DATABASE_URL`、`PORT` 等真实值由 Render 注入。

除测试环境外，缺少 `DATABASE_URL` 时后端会拒绝启动，避免线上服务在未连接数据库的情况下误运行。
生产环境缺少 `AUTH_TOKEN_PEPPER` 时同样拒绝启动。默认密码重置通知适配器不会发送邮件；发布前必须注入真实 `PasswordResetNotifier`，并确认邮件服务、退信处理、速率限制和数据驻留要求。

## 前端环境变量

前端通用变量参考 `frontend/.env.example`，环境模板分别为：

- `frontend/.env.development.example`：复制为被忽略的 `.env.local`，将 API 地址改为开发电脑的局域网 IPv4 地址。
- `frontend/.env.production.example`：EAS production 环境的变量名和格式参考。

- `EXPO_PUBLIC_API_BASE_URL`：后端 API v1 基础地址
- `EXPO_PUBLIC_APP_ENV`：`development` 或 `production`
- `EXPO_PUBLIC_SUPPORT_EMAIL`：应用内“联系客服”打开的客服邮箱地址

Expo 会把所有 `EXPO_PUBLIC_*` 值编译进客户端，因此这些变量不得包含密钥。生产模式会强制 API Base URL 使用 HTTPS。不要使用 `NODE_ENV` 为 Expo 切换 API 环境；本地使用 `.env.local`，EAS 构建使用 EAS 对应环境。

## Render 部署预留

正式配置 Render 时保留仓库根目录作为构建目录，以便使用 workspace lockfile。建议设置：

```text
Build Command:      pnpm install --frozen-lockfile && pnpm --filter @uniclife/backend build
Pre-Deploy Command: pnpm --filter @uniclife/backend db:migrate
Start Command:      pnpm --filter @uniclife/backend start
Health Check Path:  /api/v1/health
```

API 和 PostgreSQL 必须选择同一个美国区域，并使用数据库内部连接地址。Render 部署配置、资源规格、域名和生产迁移门禁将在正式部署阶段单独确定。

## 生产数据驻留要求

生产环境的 API、数据库、应用日志、对象存储和所有灾备副本必须部署并存储在美国境内。禁止将生产数据、日志、附件、备份或灾备副本跨境复制到美国以外区域。

本仓库当前不提供云厂商生产模板，也不在运行时自动校验区域。正式部署前必须由基础设施和安全负责人验证所有主区域、只读副本、日志接收端、对象存储复制规则、备份保管库及灾难恢复目标均位于美国境内，并将验证结果纳入发布检查清单。
