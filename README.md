# uniclife-keycabinet-app

UnicLife 钥匙柜应用单仓库，统一维护 Expo 前端、Node.js 后端、共享契约、文档、部署模板和自动化脚本。

## 技术栈

- 包管理：pnpm workspace
- 前端：Expo SDK 54、React Native、Expo Router、TypeScript
- 前端样式与本地化：NativeWind、统一设计令牌、expo-localization + i18n-js
- 后端：Node.js、Fastify、Drizzle ORM、postgres.js、Zod
- 共享契约：TypeScript + Zod schema

## 目录

```text
frontend/         Expo React Native 前端
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
pnpm dev:backend
pnpm dev:frontend
```

后端环境变量从 `backend/.env.example` 复制到本地 `.env` 后填写。不要提交真实 `.env`、数据库密码、设备密钥、Token、Cookie 或证书。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

前后端接口字段变更时，先更新 `shared/`，再更新接口文档和测试。
