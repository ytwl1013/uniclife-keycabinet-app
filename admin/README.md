# UnicLife Admin

轻量的 Next.js 管理后台，使用 HeroUI 3 和 Tailwind CSS 4。提供管理登录、业务概览、用户与关联柜体详情、账户启停、客服反馈双向会话、活动审计和环境状态页面。

## 本地启动

```bash
cp admin/.env.example admin/.env.local
pnpm --filter @uniclife/admin generate-env-secrets
pnpm dev:backend
pnpm dev:admin
```

`generate-env-secrets` 会在终端中隐藏地询问两次管理员登录密码，然后输出 `ADMIN_PASSWORD_HASH`、`ADMIN_SESSION_SECRET` 和 `ADMIN_API_TOKEN` 三行。手动复制到 `admin/.env.local`；其中 `ADMIN_API_TOKEN` 还要复制到后端被忽略的 `.env.development.local`，并保持完全一致。命令不会自动修改环境文件。

登录页面输入的是你刚才设置的原始密码，不是哈希值。服务端使用 bcrypt 将输入密码与 `ADMIN_PASSWORD_HASH` 校验，因此不需要记住哈希。

默认 `pnpm dev:admin` 使用 `APP_ENV=development` 对应的 `API_BASE_URL_DEVELOPMENT`。需要连接远端 Dev 后端时运行：

```bash
pnpm --filter @uniclife/admin dev:remote
```

远端 `API_BASE_URL_DEV` 必须使用 HTTPS。

## 安全边界

- 管理员密码只以 bcrypt 哈希形式保存在部署环境中。
- 登录会话使用 HMAC 签名的 HttpOnly、SameSite=Strict Cookie；生产环境使用 `__Host-` 前缀与 Secure。
- 后端 `ADMIN_API_TOKEN` 只由 Next.js 服务端读取，浏览器仅调用同源 BFF 路由。
- 客服列表和详情由服务端读取；回复与已读写操作只调用带管理会话和同源校验的 BFF，用户正文不会写入浏览器日志。
- 用户停用要求显式确认；后端撤销目标用户会话并记录审计。
- 应用提供单实例登录限流、同源校验、CSP 和基础安全响应头。多实例生产环境需在网关或共享存储层补充分布式限流。

## 验证

```bash
pnpm --filter @uniclife/admin lint
pnpm --filter @uniclife/admin typecheck
pnpm --filter @uniclife/admin test
pnpm --filter @uniclife/admin build
```
