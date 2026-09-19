# uniclife-keycabinet-app

UnicLife 钥匙柜应用单仓库，统一维护 Expo 前端、Next.js 管理后台、Node.js 后端、共享契约、文档、部署模板和自动化脚本。

## 技术栈

- 包管理：pnpm workspace
- 前端：Expo SDK 54、React Native、Expo Router、TypeScript
- 前端样式与本地化：Uniwind + Tailwind CSS 4、HeroUI Native、统一设计令牌、expo-localization + i18n-js
- 管理后台：Next.js 16、React 19、HeroUI 3、Tailwind CSS 4
- 后端：Node.js、Fastify、Drizzle ORM、postgres.js、Zod
- 共享契约：TypeScript + Zod schema

## 目录

```text
frontend/         Expo React Native 前端
admin/            Next.js 管理后台
backend/          Fastify API、业务模块、数据库和设备集成适配
shared/           前后端共享类型、枚举、权限码和 schema
docs/             产品、接口、数据库、权限、部署和模块说明
scripts/          本地开发、检查、生成、迁移和维护脚本
deploy/           Docker、环境模板和部署说明
tests/            跨端契约测试和集成测试预留
```

前端页面实现和布局直接放在 `src/app`，较大的业务组件放在 `src/features/<domain>/components`，共享 UI 放在 `src/components/ui`。Stack 和 Tab 的路由选项由最近的 `_layout.tsx` 统一声明；国际化文案和设计令牌分别集中在 `src/i18n` 与 `design-tokens.json`。

## 本地开发

```bash
pnpm install
cp backend/.env.development.example backend/.env.development
cp frontend/.env.development.example frontend/.env.local
cp admin/.env.example admin/.env.local
pnpm --filter @uniclife/admin generate-env-secrets
```

将 `frontend/.env.local` 中的示例地址改为开发电脑的局域网 IPv4 地址，保证真机与开发电脑连接同一局域网。iOS Simulator 可以使用 `localhost`。

开发数据库单独运行在 Docker 中，后端仍由本机的 watch 模式运行：

```bash
pnpm dev:db
pnpm db:migrate:dev
pnpm db:seed:dev
pnpm dev
```

- `pnpm dev:db`：启动只监听 `127.0.0.1:5432` 的 PostgreSQL 17 开发容器。
- `pnpm db:migrate:dev`：将 `backend/src/db/migrations` 中尚未执行的迁移应用到开发库。
- `pnpm db:seed:dev`：幂等写入两个虚构产品 SKU 和各自可复用的产品初始化二维码，不创建账户。
- `pnpm dev`：同时启动 Fastify 热更新服务和 Expo 开发服务。
- `pnpm dev:admin`：启动使用 `API_BASE_URL_DEVELOPMENT` 的 Next.js 管理后台。
- `pnpm --filter @uniclife/admin dev:remote`：以 `APP_ENV=dev` 启动管理后台并使用 `API_BASE_URL_DEV`。
- `pnpm dev:db:down`：停止开发数据库但保留 Docker volume 中的数据。

前端运行时直接调用 `EXPO_PUBLIC_API_BASE_URL` 指向的后端；`EXPO_PUBLIC_APP_ENV=production` 时优先使用 `EXPO_PUBLIC_API_BASE_URL_PRO`，原型 Mock 数据只保留给单元测试，不再挂载到应用。首次启动后请注册账户，再扫描开发 seed 对应的产品二维码（`docs/demo-qr-codes/bg5163-product.png` 或 `docs/demo-qr-codes/bg0680-product.png`）初始化新柜体；加入已有柜体必须扫描其设置页生成的一次性加入二维码。仅启动 Expo 而未启动后端时，登录和业务数据不会回退到 Demo。

后端按 `NODE_ENV` 加载对应的 `.env.<environment>`，生产环境由 Render 注入变量。Expo 本地开发统一使用被 Git 忽略的 `frontend/.env.local`，生产构建使用 EAS 的 production 环境。不要提交真实 `.env`、数据库密码、设备密钥、Token、Cookie 或证书。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

前后端接口字段变更时，先更新 `shared/`，再更新接口文档和测试。

真实 PostgreSQL 并发回归与 32 用户压力测试的运行方法、数据核对规则和最近结果见 [并发测试说明](docs/testing-concurrency.md)。
