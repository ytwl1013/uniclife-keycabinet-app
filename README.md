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

## 仓库与日常流程

GitHub 是日常开发和发布的主仓库，GitLab 只保留为备份仓库。本地远端固定为：

```text
origin  -> git@github.com:nimo07126/uniclife-keycabinet-app.git
gitlab  -> https://gitlab.uniclife.cn/ai-strategy-department/uniclife-keycabinet-app.git
```

`dev` 是日常集成分支，`main` 是生产发布分支。禁止直接向这两个分支推送；实现改动通过 GitHub Pull Request 合入 `dev`，准备发布时再通过 GitHub Pull Request 将 `dev` 合入 `main`。GitHub Actions 通过后，Render 才会从 `main` 自动部署后端。

### 开始一项工作

```bash
git fetch origin --prune
git switch dev
git pull --ff-only origin dev
git switch -c feat/short-description

# 修改、检查并提交
pnpm check
git add <files>
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

随后在 GitHub 创建 `feat/short-description -> dev` 的 Pull Request，等待 `CI / check` 通过并完成审核后合并。当前长期使用的 `ltdev` 也可以按同样方式向 `dev` 提交 Pull Request；不要使用 `git checkout origin dev`，它会被解释为文件名。需要创建远端跟踪分支时使用 `git switch -c <branch> --track origin/<branch>`。

### 发布到 Render

1. 确认 `dev` 的功能、迁移和测试已经完成。
2. 在 GitHub 创建 `dev -> main` 的 Pull Request。
3. `CI / check` 通过并审核后合并；不要直接推送 `main`。
4. 若本次提交涉及 `backend/`、`shared/` 或 `render.yaml`，Render 会在 GitHub 检查通过后自动部署。
5. 部署结束后访问 `https://<service>.onrender.com/api/v1/health`，确认响应中的 `code` 为 `OK`。

### 偶尔备份到 GitLab

GitLab 不再接收独立开发提交，避免两边产生不同历史。需要备份时，把 GitHub 的 `main` 和 `dev` 快照推到 GitLab 专用备份分支：

```bash
git fetch origin --prune
git push gitlab \
  origin/main:refs/heads/backup/github-main \
  origin/dev:refs/heads/backup/github-dev
```

这不会删除 GitLab 原有的 `main`、`dev` 或其他分支，也不使用强制推送。若以后启用 GitLab Pull Mirror，可用自动镜像替代这一步；仍应保持 GitHub 为唯一写入源。

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

前端运行时直接调用 `EXPO_PUBLIC_API_BASE_URL` 指向的后端，原型 Mock 数据只保留给单元测试，不再挂载到应用。首次启动后请注册账户，再扫描开发 seed 对应的产品二维码（`docs/demo-qr-codes/bg5163-product.png` 或 `docs/demo-qr-codes/bg0680-product.png`）初始化新柜体；加入已有柜体必须扫描其设置页生成的一次性加入二维码。仅启动 Expo 而未启动后端时，登录和业务数据不会回退到 Demo。

开发 seed 只用于本地测试，生产数据库不运行 seed。生产 SKU 在 Admin 的“产品与二维码”中创建：SKU 与生成的产品二维码永久不变，图片、名称和描述等展示资料可继续修改；二维码可下载为高清 PNG 或 SVG 后交付批量印刷。产品原图会先在管理员浏览器中缩放、转 WebP、压缩并清除元数据，后端只接收不超过 700 KiB 的结果，避免占用 Render 免费实例做图片处理。

后端按 `NODE_ENV` 加载对应的 `.env.<environment>`，生产环境由 Render 注入变量。Expo 本地开发统一使用被 Git 忽略的 `frontend/.env.local`，生产构建使用 EAS 的 production 环境。不要提交真实 `.env`、数据库密码、设备密钥、Token、Cookie 或证书。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

前后端接口字段变更时，先更新 `shared/`，再更新接口文档和测试。
