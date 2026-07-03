# 部署说明

部署模板位于 `deploy/`。当前仅提供开发环境 Docker Compose 草案，不包含任何真实密钥。

## 环境变量

后端变量参考 `backend/.env.example`：

- `DATABASE_URL`：PostgreSQL 连接串，占位格式，不提交真实值
- `PORT`：后端监听端口
- `HOST`：后端监听地址
- `LOG_LEVEL`：日志级别
- `FRONTEND_ORIGIN`：允许跨域访问的前端地址

前端变量参考 `frontend/.env.example`：

- `EXPO_PUBLIC_API_BASE_URL`：后端 API v1 基础地址
