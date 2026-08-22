# API 约定

基础地址为 `/api/v1`。除健康检查、注册、登录和密码重置外，其余接口都要求：

```http
Authorization: Bearer <opaque-session-token>
Content-Type: application/json
```

会话 Token 只在注册或登录成功时返回一次，数据库仅保存带服务端 pepper 的摘要。前端后续接入时应将 Token 放入系统安全存储，不得写入普通日志或 AsyncStorage。

## 稳定返回格式

成功和失败都使用 `{ code, message, data }`：

```json
{
  "code": "OK",
  "message": "ok",
  "data": {}
}
```

```json
{
  "code": "VERSION_CONFLICT",
  "message": "钥匙柜数据已更新，请刷新后重试",
  "data": {
    "expectedVersion": 2,
    "actualVersion": 3
  }
}
```

Zod 参数校验失败返回 HTTP 400 / `VALIDATION_ERROR`；无会话和会话过期返回 HTTP 401；无柜体成员权限返回 HTTP 403；资源冲突返回 HTTP 409。

## Auth 与账户

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 注册、记录条款/隐私同意并创建会话 | 公开 |
| POST | `/auth/sign-in` | 邮箱密码登录并创建可撤销会话 | 公开 |
| POST | `/auth/sign-out` | 撤销当前会话 | 登录 |
| GET | `/auth/session` | 获取当前会话用户 | 登录 |
| POST | `/auth/password-resets` | 创建六位验证码挑战；始终返回泛化结果，防止邮箱枚举 | 公开 |
| POST | `/auth/password-resets/verify` | 校验验证码并签发短时重置 Token | 公开 |
| POST | `/auth/password-resets/complete` | 修改密码并撤销全部旧会话 | 公开 |
| GET | `/users/me` | 当前账户资料 | 登录 |
| PATCH | `/users/me/profile` | 更新名称和头像 URI | 本人 |
| PATCH | `/users/me/email` | 更新邮箱 | 本人 |
| PATCH | `/users/me/password` | 校验当前密码后修改密码 | 本人 |
| DELETE | `/users/me` | 匿名化并停用账户，保留不可抵赖业务记录 | 本人 |

注册请求示例：

```json
{
  "email": "person@example.com",
  "password": "at-least-8-characters",
  "displayName": "Example Person",
  "locale": "zh-CN",
  "acceptedTerms": true,
  "acceptedPrivacy": true
}
```

密码重置通过 `PasswordResetNotifier` 适配器发送验证码。当前默认适配器不会外发邮件；开发环境可显式设置 `AUTH_ALLOW_RESET_CODE_PREVIEW=true`，此时请求响应带 `previewCode`。生产环境强制禁止预览，接入真实邮件提供商前该流程不会向用户送达验证码。

## 柜体、钥匙和借还

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/cabinets` | 当前用户柜体列表及容量、占用、借出、逾期统计 |
| GET | `/cabinets/:cabinetId` | 柜体、SKU、槽位、钥匙、成员和有效借用详情 |
| POST | `/cabinets/resolve-qr` | 解析并校验 `uniclife://cabinet/<SKU>/<UUID>` |
| POST | `/cabinets/bind` | 首次绑定时创建柜体和全部槽位；再次扫描恢复/返回成员关系 |
| PATCH | `/cabinets/:cabinetId` | 重命名柜体 |
| DELETE | `/cabinets/:cabinetId/members/:membershipId` | 移除其他成员 |
| DELETE | `/cabinets/:cabinetId/keys` | 永久删除柜内钥匙资料，将有效借用标记为 cancelled，并保留历史引用和事件 |
| POST | `/cabinets/:cabinetId/keys` | 在空槽位创建钥匙 |
| PATCH | `/keys/:keyId` | 更新钥匙名称或备注 |
| DELETE | `/keys/:keyId` | 删除单把钥匙；存在有效借用时拒绝 |
| POST | `/keys/:keyId/checkout` | 领取钥匙并创建有效借用和事件 |
| POST | `/keys/:keyId/return` | 归还钥匙并关闭有效借用 |

柜体写请求可携带 `expectedVersion`。服务端使用条件更新保证版本一致，冲突时整个事务回滚并返回当前版本。

领取和归还必须携带 8–128 字符的 `requestId`；其他写请求也建议携带。服务端按“操作者 + 操作类型 + requestId”保存 24 小时幂等结果，重复请求返回首次响应。

领取示例：

```json
{
  "borrowerName": "Example Borrower",
  "borrowerContact": "borrower@example.com",
  "expectedReturnAt": "2026-08-22T10:00:00.000Z",
  "expectedVersion": 3,
  "requestId": "checkout-018f4a73"
}
```

## 借用与活动查询

| 方法 | 路径 | 查询参数 |
| --- | --- | --- |
| GET | `/records/loans` | `cabinetId`、`status=active|returned|cancelled`、`limit` |
| GET | `/records/events` | `cabinetId`、`keyId`、`actorId`、`type`、`from`、`to`、`limit` |

查询始终通过当前用户的有效柜体成员关系过滤。活动接口只读，不提供下载、撤销或修改能力。

## 主要业务错误码

- `SESSION_REQUIRED`、`SESSION_EXPIRED`
- `EMAIL_ALREADY_REGISTERED`、`INVALID_CREDENTIALS`
- `RESET_CHALLENGE_INVALID`、`RESET_CODE_INVALID`
- `QR_NOT_FOUND`、`QR_DISABLED`
- `MEMBERSHIP_REQUIRED`、`MEMBER_NOT_FOUND`
- `SLOT_NOT_FOUND`、`SLOT_OCCUPIED`
- `KEY_NOT_FOUND`、`KEY_NOT_AVAILABLE`、`KEY_NOT_BORROWED`
- `ACTIVE_LOAN_NOT_FOUND`、`ACTIVE_LOANS_BLOCK_CLEAR`
- `EXPECTED_RETURN_INVALID`、`VERSION_CONFLICT`、`REQUEST_IN_PROGRESS`

请求/响应的稳定字段和校验 schema 定义在 `shared/src`；字段变化必须先改共享契约，再同步前端适配器和本文档。
