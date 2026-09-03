# UnicLife Admin

轻量的 Next.js 管理后台，使用 HeroUI 3 和 Tailwind CSS 4。提供管理登录、业务概览、用户与关联柜体详情、账户启停、客服反馈双向会话、活动审计和环境状态页面。

## 本地启动

```bash
cp admin/.env.example admin/.env.local
pnpm --filter @uniclife/admin generate-env-secrets
pnpm dev:backend
pnpm dev:admin
```

`generate-env-secrets` 会在终端中隐藏地询问两次管理员登录密码，然后输出 `ADMIN_PASSWORD_HASH`、`ADMIN_SESSION_SECRET`、`ADMIN_API_TOKEN_DEV` 和 `ADMIN_API_TOKEN_PRO`。手动复制到 `admin/.env.local`；DEV 令牌还要作为 `ADMIN_API_TOKEN` 写入本地后端，PRO 令牌则写入 Render 的同名变量。命令不会自动修改环境文件。

登录页面输入的是你刚才设置的原始密码，不是哈希值。服务端使用 bcrypt 将输入密码与 `ADMIN_PASSWORD_HASH` 校验，因此不需要记住哈希。

Admin 的两个本地启动命令分别选择本机和 Render 后端：

```bash
pnpm dev:admin
pnpm pro:admin
```

`pnpm dev:admin` 使用 `APP_ENV=dev`、`API_BASE_URL_DEV` 和 `ADMIN_API_TOKEN_DEV`；`pnpm pro:admin` 使用对应的 `*_PRO` 变量，并强制生产 API 使用 HTTPS。旧的单一 `ADMIN_API_TOKEN` 暂时作为兼容回退值。

## 产品 SKU 与生产二维码

“产品与二维码”页面用于初始化和维护生产数据库中的产品型号：

1. 新建产品并确认 SKU、型号、容量和说明书地址。
2. 选择 JPEG、PNG 或 WebP 原图。Admin 在当前浏览器内完成方向校正、最长边缩放至 1280px、白底合成、WebP 转换、压缩至 700 KiB 内、元数据清除和 SHA-256 计算；原图不会上传到后端。
3. 保存后，后端在单一事务中创建 SKU、预处理后的图片和一个密码学随机产品二维码。
4. 下载 1800px PNG 或 SVG 交给生产批量打印。
5. 后续可修改名称、型号、颜色、描述、说明书地址和图片，SKU 与二维码不会变化。已有柜体使用该 SKU 后，槽位容量也会锁定，避免柜体槽位结构与产品定义不一致。

生产环境不要运行开发 seed。部署迁移后，直接通过本页面创建需要投产的少量 SKU。当前方案把 WebP 二进制保存在 PostgreSQL 的独立图片表中，适合 SKU 数量较少的场景；若图片规模明显增长，应迁移至美国境内的对象存储，并继续保留浏览器端预处理。

## 安全边界

- 管理员密码只以 bcrypt 哈希形式保存在部署环境中。
- 登录会话使用 HMAC 签名的 HttpOnly、SameSite=Strict Cookie；生产环境使用 `__Host-` 前缀与 Secure。
- 后端 `ADMIN_API_TOKEN` 只由 Next.js 服务端读取，浏览器仅调用同源 BFF 路由。
- 产品写入同样只经过带管理会话的同源 BFF；后端校验 WebP 签名、长度和摘要，但不执行图片解码、缩放或压缩。
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
