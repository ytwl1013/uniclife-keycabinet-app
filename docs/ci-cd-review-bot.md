# CI/CD 与 Review 流程

GitHub `ytwl1013/uniclife-keycabinet-app` 是权威主仓库，负责日常开发、Pull Request、CI 和生产发布。自建 GitLab 仓库只作为备份与历史流程保留，不再作为日常合并入口。

## 分支职责

- `backend_main`：当前 Render 后端部署分支；经用户明确授权，在本地验证后正常推送，提交触发部署。
- `main`：生产发布分支，仅接受来自 `dev` 的 GitHub Pull Request。
- `dev`：日常集成分支，仅接受功能分支或 `ltdev` 的 GitHub Pull Request。
- `feat/*`、`fix/*`、`ltdev`：实现分支，可以直接推送到 GitHub，但必须通过 Pull Request 才能进入 `dev`。

`dev` 和 `main` 都禁止直接推送。紧急修复从 `main` 创建 `fix/*`，通过 Pull Request 合入 `main` 后，还必须再通过 Pull Request 同步回 `dev`。

## GitHub Actions

`.github/workflows/ci.yml` 在以下事件运行：

- 面向 `dev`、`main` 或 `backend_main` 的 Pull Request。
- 推送到 `dev`、`main` 或 `backend_main`，用于验证最终合并提交并给 Render 提供检查结果。

唯一必需 Job 名为 `check`，它执行：

- 检查 `AGENTS.md`、`README.md` 和禁止提交的密钥类文件。
- 使用仓库声明的 pnpm 版本和 Node.js 24 安装锁定依赖。
- 使用临时 PostgreSQL 17 服务执行迁移和测试 seed，设置 `RUN_DATABASE_TESTS=true`，并生成仅本次测试使用的随机管理令牌。
- 运行 `pnpm check`，覆盖 lint、TypeScript 类型检查、数据库并发/记录一致性集成测试和前端测试，再构建后端。

在 GitHub 的 Branch protection 或 Ruleset 中为 `dev`、`main` 配置：

- Require a pull request before merging。
- Require status checks to pass，选择 `CI / check`。
- Require branches to be up to date before merging。
- 禁止绕过规则直接推送；如仓库协作人数允许，至少要求 1 次审核。

## Render 发布门禁

`render.yaml` 连接 GitHub `backend_main`，`autoDeployTrigger` 为 `commit`，与当前用户指定的 On Commit 发布方式一致。推送即触发部署，Actions 是并行验证而不是部署门禁，所以推送前必须完成本地检查。`dev` 和 `main` 的 PR/审核限制保持不变。不得用强制推送覆盖远端独有改动。

Render 的 Build Command 仍会构建后端并运行数据库迁移。当前免费 Web Service 不支持 Pre-Deploy Command；升级付费方案后应把迁移移动到 `preDeployCommand`。

## GitLab 备份

本地远端命名固定为：

```text
origin  GitHub 主仓库
gitlab  自建 GitLab 备份仓库
```

GitLab 不再接收独立实现改动。人工备份只更新专用分支，避免和原有受保护的 `dev`、`main` 发生冲突：

```bash
git fetch origin --prune
git push gitlab \
  origin/main:refs/heads/backup/github-main \
  origin/dev:refs/heads/backup/github-dev
```

不要使用 `--force`。如果希望完全自动化，可在 GitLab 配置从 GitHub 到 GitLab 的单向 Pull Mirror，并确保 GitHub 始终是唯一写入源。

## 原 GitLab Review Bot

历史 GitLab Merge Request 的 LAN Review Bot 地址仍为：

```text
http://192.168.50.18:8797/gitlab/webhook
```

Webhook Secret 和 GitLab Bot Token 只保存在 Bot 运行环境中，不进入仓库。该 Bot 与 `.gitlab-ci.yml` 仅用于历史 Merge Request 或灾备演练，不是 GitHub 主流程或 Render 生产发布的门禁。

## 运维检查

- GitHub 默认分支为 `main`，`dev` 和 `main` 的 Ruleset 已启用。
- GitHub Pull Request 能看到并通过 `CI / check`。
- Render 连接 GitHub `backend_main`，Auto-Deploy 为 **On Commit**，并确认本次部署提交。
- Render 的 `DATABASE_URL` 使用现有数据库的 Internal Database URL，且未写入仓库。
- GitLab `backup/github-main` 和 `backup/github-dev` 能按需快进更新。

不得提交生产密钥、Webhook Secret、GitHub/GitLab Token、设备密钥、数据库密码、Cookie、私钥或真实 `.env` 文件。
