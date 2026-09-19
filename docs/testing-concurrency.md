# 并发回归与业务记录核对

## 运行边界

本地专用 PostgreSQL 17 测试库使用虚构账户和数据，不连接生产数据库、已有 HTTP 服务、真实硬件或外部邮箱。负载脚本仅允许 `NODE_ENV=test`、回环数据库地址，且库名必须以 `keycabinet_load` 开头；若库内已有账户则拒绝运行，不会清空已有数据。

依赖安装后，在一个空的专用数据库上迁移并载入虚构产品目录。以下连接是无密码的本地临时测试库示例，不能用于部署：

```bash
export NODE_ENV=test
export DATABASE_URL=postgres://postgres@127.0.0.1:5432/keycabinet_load
export LOG_LEVEL=silent
pnpm --filter @uniclife/shared build
pnpm --filter @uniclife/backend exec drizzle-kit migrate
pnpm --filter @uniclife/backend exec tsx src/db/seed.ts
LOAD_REPORT_PATH=/tmp/keycabinet-load-results.json pnpm --filter @uniclife/backend test:load
```

另一个专用回归库（例如 `keycabinet_test`）迁移、seed 后，运行：

```bash
RUN_DATABASE_TESTS=true FRONTEND_ORIGIN=http://192.168.50.53:8081 pnpm --filter @uniclife/backend test
pnpm --filter @uniclife/frontend test
```

`RUN_DATABASE_TESTS=true` 必须显式设置，CI 已启用。较大的负载脚本通过 `test:load` 单独运行，不会混入默认单测。

## 场景与判定

- 32 个注册用户，4 个共享柜体，40 轮独立钥匙借还；32 个工作流并发。
- 同一钥匙多人争抢、不同钥匙并行、钥匙资料更新、使用同一旧柜体版本的重命名。
- 相同 requestId 并行重放，峰值 128 个同时发起的 API 请求，响应必须复用同一业务事件。
- 删除与领取、批量清空与领取、移除成员与领取交错；撤权后必须拒绝成员操作。
- 32 个并发工作流通过真实 HTTP 完成 128 次借还请求。
- 最后批量清空带有效借用的柜体，核对删除数量与 cancelled 数量，并保留历史借用、事件和审计。

每个阶段直接核对 PostgreSQL：有效借用没有孤立/重复项；钥匙状态与有效借用匹配；借用人的输入、操作者、keyId 与持久化记录一致；借还事件与 loan 双向对应，时间与操作者匹配；每次借还和钥匙增改删都有且只有一条对应成功审计；每个失败业务响应都有失败审计；柜体版本增量等于业务事件数；幂等记录没有未完成占位；成功响应事件 ID 集合与数据库事件集合完全一致。

重现原锁顺序死锁的回归测试还会用受控 PostgreSQL 行锁强制请求交错，不仅依靠概率碰撞。前端组件测试验证刷新期间通知会触发补拉，以及 200 条历史不会挤掉详情中的活动借用。

压力测试的大部分请求通过 Fastify 注入完整请求流水线，并赋予每个测试用户不同来源地址，保留真实认证、限流、事务、权限和审计；其中 128 次使用实际回环 HTTP 连接。因此下面的整体延迟不是公网网络或生产网关性能指标，也未证明多实例推送、长期稳定性或生产最大容量。

## 2026-09-19 验收结果

修复基于 ltdev `e43adbf`，位于 `fix/concurrent-key-workflows` 分支；数据库连接池保持默认 10。所有阶段核对通过，零非预期错误，PostgreSQL 日志没有死锁。

| 场景 | 请求数 | HTTP 状态分布 | P95 |
| --- | ---: | --- | ---: |
| setup | 320 | 200: 288, 201: 32 | 51 ms |
| 32-users-independent-keys | 2560 | 200: 2560 | 143 ms |
| 32-users-key-metadata | 32 | 200: 32 | 92 ms |
| 32-users-stale-version-renames | 36 | 200: 8, 409: 28 | 77 ms |
| 32-users-contended-keys | 1280 | 200: 160, 409: 1120 | 80 ms |
| 128-concurrent-idempotent-replays | 256 | 200: 256 | 311 ms |
| delete-checkout-races | 144 | 200: 96, 404: 25, 409: 23 | 41 ms |
| clear-checkout-races | 32 | 200: 28, 404: 4 | 19 ms |
| member-removal-checkout-races | 36 | 200: 28, 403: 8 | 17 ms |
| real-http-32-workers | 128 | 200: 128 | 164 ms |
| bulk-clear-with-active-loans | 12 | 200: 12 | 23 ms |

最终共有 **4,836 次请求**。其中 403/404/409 为刻意制造的撤权、资源删除及并发冲突，均核对了预期结果与审计；不存在 500 或 429。

| 业务数据 | 数量 |
| --- | ---: |
| 测试用户 / 柜体 | 32 / 12 |
| 借用记录 | 1,479 |
| 已归还 / 批量清空取消 / 仍有效 | 1,456 / 23 / 0 |
| 操作事件 | 3,240 |
| 审计记录 | 4,612 |
| 幂等成功记录 | 3,240 |
| 失败业务请求与对应失败审计 | 1,208 / 1,208 |

最后 23 条取消来自明确执行的批量清空动作，不是丢失的归还。相关清空响应的取消数量与数据库逐柜核对一致。并发调度不同可能改变某些竞态的赢家与最终取消数量，测试对业务不变量和响应台账断言，不依赖固定赢家。

后端 40 项测试通过（包含真实数据库集成），前端 96 项测试通过；前端 lint、前后端类型检查、共享契约构建、后端构建通过。CI YAML 已本地解析验证，远端流水线结果需另行确认。密码重置通过受控邮件接收器验证完整请求、验证码校验、密码更新、旧会话撤销与投递失败审计；外部 SMTP 实际投递、真机开柜和生产部署未在此次验收范围内。

## 数据与回滚影响

此次无数据库结构变更、无新环境变量。SMTP 沿用 MAIL_* 配置。部署是前后端代码更新；回退代码不会要求数据库迁移，但会重新引入此次修复的并发与展示问题。历史库已有的孤立借用需要另行只读排查并审批修复，本次不自动修改现有业务数据。
