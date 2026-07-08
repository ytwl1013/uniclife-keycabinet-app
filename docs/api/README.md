# API 约定

## 路径

后端 API 使用 `/api/v1/模块/资源`。当前已预留：

- `GET /api/v1/health`
- `GET /api/v1/users`

## 返回格式

所有接口保持稳定 envelope：

```json
{
  "code": "OK",
  "message": "ok",
  "data": {}
}
```

失败时：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数不合法",
  "data": null
}
```

## 权限与审计

写操作必须在后端执行身份认证、权限校验、参数校验和审计记录。钥匙领取、归还、强制开柜、异常处理、权限变更属于高风险动作，必须记录操作者、时间、对象、结果和失败原因。
