# uniclife-keycabinet-app

UnicLife 钥匙柜应用仓库。

当前仓库处于初始化规划阶段，暂未放入业务代码。请先审核根目录 `AGENTS.md` 中的单仓库前后端目录规划和自动化 Agent 工作规范。

后续确认后再创建前端、后端、共享契约、文档、脚本和部署目录。

## 协作与 CI/CD

- 日常实现工作通过 Merge Request 合入 `dev`。
- `dev` 禁止直接推送，MR 需要通过 GitLab CI。
- Codex review bot 会自动审核非 draft 的 `dev` 目标 MR，审核通过后按 GitLab 分支保护和 CI 状态自动合并。
- 当前初始化阶段的 CI 先执行仓库规范和敏感信息检查；新增前端、后端或共享契约代码时必须扩展对应 lint、类型检查、测试和构建任务。

更多细节见 `docs/ci-cd-review-bot.md`。
