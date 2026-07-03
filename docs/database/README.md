# 数据库说明

后端使用 Drizzle ORM 管理 PostgreSQL schema。schema 定义位于 `backend/src/db/schema.ts`，迁移文件输出目录为 `backend/src/db/migrations`。

## 当前规划表

- `users`：用户与人员编号
- `cabinets`：钥匙柜主数据和设备状态
- `keys`：钥匙、柜体、槽位和状态
- `records`：领取、归还、盘点、异常开柜等业务记录
- `audit_logs`：关键动作审计日志

## 迁移要求

新增或修改表结构时必须说明用途、索引、约束、回滚策略和兼容影响。生成迁移前确认 `DATABASE_URL` 指向本地或测试库，不得使用生产库。
