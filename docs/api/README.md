# API 约定

基础地址为 `/api/v1`。除健康检查、注册、登录和密码重置外，其余接口都要求：

```http
Authorization: Bearer <opaque-session-token>
Content-Type: application/json
```

会话 Token 只在注册或登录成功时返回一次，数据库仅保存带服务端 pepper 的摘要。Expo 前端将 Token 放入 iOS Keychain / Android Keystore（Expo SecureStore）；Web 开发仅保存在当前标签页的 sessionStorage，不写入普通日志或 AsyncStorage。`/admin/*` 是例外：它只接受部署平台注入的独立服务端令牌，由 Next.js 管理后台在服务端调用，浏览器不得直接请求或持有该令牌。

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
| PATCH | `/users/me/home-guide` | 记录当前账户已处理首页导航提示 | 本人 |
| PATCH | `/users/me/profile` | 更新名称和头像 URI | 本人 |
| PATCH | `/users/me/email` | 更新邮箱 | 本人 |
| PATCH | `/users/me/password` | 校验当前密码后修改密码 | 本人 |
| DELETE | `/users/me` | 匿名化并停用账户；若仍是任意箱子的超级管理员则返回 409，需先转让或删除箱子 | 本人 |
| POST | `/support/feedback` | 提交产品/应用反馈并通过后端 SMTP 发送邮件 | 登录 |
| GET | `/support/feedback` | 查询当前用户最近的反馈发送记录；支持 `limit=1..100` | 本人 |

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

注册、登录、`GET /auth/session` 和当前账户写接口返回的本人资料还包含 `loginCount`、`lastLoginAt` 与 `homeGuidePromptedAt`。注册并创建会话计为第一次登录；每次密码登录在数据库事务内原子增加次数并更新时间。首页导航提示接口只接受 `prompted: true`，可携带 `requestId`，并记录成功审计。登录统计和导航状态不会出现在柜体成员或活动参与者资料中。

```json
{
  "prompted": true,
  "requestId": "home-guide-user-018f4a73"
}
```

密码重置通过 `PasswordResetNotifier` 适配器发送验证码。当前默认适配器不会外发邮件；开发环境可显式设置 `AUTH_ALLOW_RESET_CODE_PREVIEW=true`，此时请求响应带 `previewCode`。生产环境强制禁止预览，接入真实邮件提供商前该流程不会向用户送达验证码。

## 管理后台

管理接口使用 `Authorization: Bearer <ADMIN_API_TOKEN>`，不接受普通用户会话 Token。令牌缺失或错误返回 401，服务端未配置返回 503。所有响应继续使用稳定的 `{ code, message, data }` 格式。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/overview` | 用户、有效会话、柜体指标，近 7 日活动趋势与最近审计事件 |
| GET | `/admin/users` | 全局用户列表；支持 `query`、`status=all\|active\|disabled`、`limit`、`offset` |
| GET | `/admin/activities` | 全局审计列表；支持 `query`、`result=all\|success\|failure`、`limit`、`offset` |
| PATCH | `/admin/users/:userId/status` | 启用或停用用户；停用会撤销该用户全部有效会话 |

用户状态写操作限制为每分钟 20 次，并写入 `admin.user_status_updated` 审计事件，记录目标用户、变更前后状态和环境管理员标识。返回数据不包含密码哈希、会话 Token、审计 metadata 或其他管理密钥。

反馈请求由后端从会话读取用户 ID、用户名和登录邮箱，客户端不能覆盖这些身份字段。邮件主题包含唯一反馈编号，正文包含身份信息与提交时间，`Reply-To` 使用登录邮箱。反馈类型为 `product` 或 `application`（默认）；称呼与标题可选，内容必填且最多 5000 字符。最多附带 5 张 JPEG 图片，每张 Base64 数据最多 2,000,000 字符；前端会先缩放和压缩。接口单独限制为每个客户端每小时 5 次，成功或失败均写入通用审计日志；邮件未配置返回 `FEEDBACK_UNAVAILABLE`，SMTP 发送失败返回 `FEEDBACK_SEND_FAILED`。

每次提交会持久化一条发送记录：反馈编号、用户 ID/用户名/邮箱快照、称呼、类型、标题、内容、图片数量、`sending|sent|failed` 状态、失败码及时间。图片 Base64 和附件文件不写入数据库。历史查询按当前会话的用户 ID 在 SQL 层过滤，不能查看其他账户的反馈，默认返回最近 50 条、最多 100 条。

```json
{
  "salutation": "Alex",
  "type": "application",
  "title": "无法提交归还",
  "content": "点击确认归还后显示网络错误。",
  "images": [
    {
      "fileName": "feedback-1.jpg",
      "mimeType": "image/jpeg",
      "data": "<base64>"
    }
  ]
}
```

历史响应示例：

```json
{
  "items": [
    {
      "id": "feedback-018f4a73",
      "userId": "user-018f4a73",
      "userDisplayName": "Alex",
      "userEmail": "alex@example.com",
      "salutation": "Alex",
      "type": "application",
      "title": "无法提交归还",
      "content": "点击确认归还后显示网络错误。",
      "imageCount": 1,
      "status": "sent",
      "failureCode": null,
      "submittedAt": "2026-08-24T08:00:00.000Z",
      "deliveredAt": "2026-08-24T08:00:01.000Z"
    }
  ]
}
```

## 柜体、钥匙和借还

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/cabinets` | 当前用户柜体列表及容量、占用、借出、逾期统计 |
| GET | `/cabinets/:cabinetId` | 柜体、SKU、槽位、钥匙、成员和有效借用详情 |
| POST | `/cabinets/resolve-qr` | 解析产品初始化码或一次性柜体加入码，并返回判别类型 |
| POST | `/cabinets/initialize` | 扫描同 SKU 共用的产品码，每个新的 `requestId` 创建一个新柜体和全部槽位；创建者为超级管理员 |
| POST | `/cabinets/:cabinetId/join-invitations` | 为有效柜体成员生成十分钟有效的一次性加入二维码，并撤销旧的未使用二维码 |
| DELETE | `/cabinets/:cabinetId/join-invitations/:invitationId` | 立即撤销未使用的加入二维码 |
| POST | `/cabinets/join` | 原子消费一次性加入码并创建或恢复当前账户的 Admin 成员关系 |
| PATCH | `/cabinets/:cabinetId` | 重命名柜体 |
| POST | `/cabinets/:cabinetId/super-admin-transfer` | 超级管理员把权限原子转让给指定有效管理员，原角色降为 Admin |
| DELETE | `/cabinets/:cabinetId/membership` | 普通管理员解除当前账户绑定；保留柜体、历史与审计，超级管理员不能调用 |
| DELETE | `/cabinets/:cabinetId/members/:membershipId` | 超级管理员移除指定普通管理员 |
| DELETE | `/cabinets/:cabinetId` | 超级管理员永久删除箱子、全部绑定、邀请、槽位、钥匙、借用、事件和旧箱子审计 |
| DELETE | `/cabinets/:cabinetId/keys` | 永久删除柜内钥匙资料，将有效借用标记为 cancelled，并保留历史引用和事件 |
| POST | `/cabinets/:cabinetId/keys` | 在空槽位创建钥匙 |
| PATCH | `/keys/:keyId` | 更新钥匙名称或备注 |
| DELETE | `/keys/:keyId` | 删除单把钥匙；存在有效借用时拒绝 |
| POST | `/keys/:keyId/checkout` | 领取钥匙并创建有效借用和事件 |
| POST | `/keys/:keyId/return` | 归还钥匙并关闭有效借用 |

产品初始化码格式为 `uniclife://cabinet/v1/init/<SKU>/<PRODUCT_CODE>`。同一 SKU 使用同一个可批量印刷的码；每次用户重新扫码会生成新的 `requestId` 并创建独立柜体。同一扫码会话的网络重试必须复用 `requestId`，避免超时重试创建重复柜体。

柜体加入码格式为 `uniclife://cabinet/v1/join/<OPAQUE_TOKEN>`，只由已绑定成员在箱子设置页生成。Token 使用密码学安全随机数，数据库只保存带服务端 pepper 的摘要；二维码十分钟过期、单次使用，生成新码会撤销旧码。日志、业务事件和审计 metadata 均不得保存 Token 原文。

除初始化和加入外，柜体写请求可携带 `expectedVersion`。服务端使用条件更新保证版本一致，冲突时整个事务回滚并返回当前版本。

当前账户从“你的箱子”管理页删除箱子时，前端按当前成员角色选择接口：普通管理员调用 `DELETE /cabinets/:cabinetId/membership`，只停用自己的成员关系；超级管理员调用 `DELETE /cabinets/:cabinetId`，永久删除整个箱子和所有关联信息。两种操作都必须携带可复用的 `requestId` 与 `expectedVersion`。硬删除会清理旧箱子审计，但额外保留一条不含敏感明文的 `cabinets.deleted` 全局审计，记录删除者和聚合数量。

超级管理员转让请求示例：

```json
{
  "membershipId": "membership-target",
  "expectedVersion": 4,
  "requestId": "transfer-super-admin-018f4a73"
}
```

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

## 实时变更通知

`GET /realtime` 是已登录客户端的 WebSocket 升级端点，子协议为 `uniclife.realtime.v1`。原生 Expo 客户端通过 `Authorization: Bearer <token>` 握手头鉴权；Web 开发因浏览器 WebSocket API 不允许自定义 Authorization 头，将同一会话凭据编码到 `Sec-WebSocket-Protocol` 头的鉴权子协议中，不放入 URL。该头已在服务端日志中整体脱敏，生产环境必须使用 `wss://`。

连接成功后服务端发送 `realtime.ready`。柜体、成员、钥匙、借还或活动在业务事务提交后发送以下失效通知：

```json
{
  "type": "workspace.changed",
  "eventId": "realtime-uuid",
  "occurredAt": "2026-08-24T08:00:00.000Z",
  "cabinetId": "cabinet-uuid",
  "cabinetVersion": 7,
  "resources": ["keys", "loans", "events"]
}
```

通知不是数据源；客户端根据版本判断后通过 REST 重新验证数据。服务端每 45 秒发送协议级 Ping，连续一个检查周期未收到 Pong 时终止连接。退出、改密、重置密码或删号会立即关闭已撤销会话的连接。

## 主要业务错误码

- `SESSION_REQUIRED`、`SESSION_EXPIRED`
- `EMAIL_ALREADY_REGISTERED`、`INVALID_CREDENTIALS`
- `RESET_CHALLENGE_INVALID`、`RESET_CODE_INVALID`
- `FEEDBACK_UNAVAILABLE`、`FEEDBACK_SEND_FAILED`
- `QR_NOT_FOUND`、`QR_DISABLED`
- `JOIN_INVITATION_NOT_FOUND`、`JOIN_INVITATION_REVOKED`、`JOIN_INVITATION_USED`、`JOIN_INVITATION_EXPIRED`、`JOIN_INVITATION_INVALID`
- `MEMBERSHIP_REQUIRED`、`MEMBER_NOT_FOUND`
- `SUPER_ADMIN_REQUIRED`、`SUPER_ADMIN_PROTECTED`、`SUPER_ADMIN_TRANSFER_REQUIRED`、`SUPER_ADMIN_TRANSFER_TARGET_INVALID`
- `SLOT_NOT_FOUND`、`SLOT_OCCUPIED`
- `KEY_NOT_FOUND`、`KEY_NOT_AVAILABLE`、`KEY_NOT_BORROWED`
- `ACTIVE_LOAN_NOT_FOUND`、`ACTIVE_LOANS_BLOCK_CLEAR`
- `EXPECTED_RETURN_INVALID`、`VERSION_CONFLICT`、`REQUEST_IN_PROGRESS`

请求/响应的稳定字段和校验 schema 定义在 `shared/src`；字段变化必须先改共享契约，再同步前端适配器和本文档。
