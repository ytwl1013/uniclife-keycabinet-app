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
| PATCH | `/users/me/profile` | 更新名称；`avatarUri` 仅兼容历史客户端，当前移动端头像只保存在本机 | 本人 |
| PATCH | `/users/me/email` | 更新邮箱 | 本人 |
| PATCH | `/users/me/password` | 校验当前密码后修改密码 | 本人 |
| POST | `/users/me/push-tokens` | 注册或更新当前会话设备的 Expo 推送令牌 | 本人 |
| DELETE | `/users/me/push-tokens` | 移除当前账户的指定 Expo 推送令牌 | 本人 |
| DELETE | `/users/me` | 匿名化并停用账户；若仍是任意箱子的超级管理员则返回 409，需先转让或删除箱子 | 本人 |
| POST | `/support/feedback` | 提交产品/应用反馈并通过后端 SMTP 发送邮件 | 登录 |
| GET | `/support/feedback` | 查询当前用户最近的反馈会话摘要；支持 `limit=1..100` | 本人 |
| GET | `/support/feedback/:feedbackId` | 查询本人反馈的完整双向消息时间线 | 本人 |
| POST | `/support/feedback/:feedbackId/messages` | 在本人反馈会话中回复客服 | 本人 |
| POST | `/support/feedback/:feedbackId/read` | 把本人会话中的客服回复标为已读 | 本人 |

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

推送令牌接口只接受 `ios|android` 和合法的 `ExpoPushToken[...]`/`ExponentPushToken[...]`。令牌绑定当前登录会话，同一令牌再次注册时转移到最新账户和会话；退出登录、会话失效或账户停用后不会再用于发送。服务端响应、审计和业务日志均不得输出原始推送令牌。

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
| GET | `/admin/products` | 产品列表；支持 `query`、`limit`、`offset` |
| GET | `/admin/products/:productId` | 产品、图片元数据、不可变二维码和已初始化柜体数量 |
| POST | `/admin/products` | 创建 SKU、预处理图片和永久产品二维码 |
| PATCH | `/admin/products/:productId` | 更新产品展示资料和可选图片；不能修改 SKU 或二维码 |
| GET | `/admin/users` | 全局用户列表；支持 `query`、`status=all\|active\|disabled`、`limit`、`offset` |
| GET | `/admin/users/:userId` | 用户详情、有效会话数、绑定柜体状态、产品与钥匙统计，以及柜体的全部有效管理员 |
| GET | `/admin/feedback` | 全局客服反馈；支持 `query`、会话 `status`、`limit`、`offset` |
| GET | `/admin/feedback/:feedbackId` | 反馈身份快照与完整双向消息时间线 |
| POST | `/admin/feedback/:feedbackId/messages` | 代表客服回复用户；写入 App 会话并尝试发送邮件 |
| POST | `/admin/feedback/:feedbackId/read` | 把会话中的用户消息标为客服已读 |
| GET | `/admin/activities` | 全局审计列表；支持 `query`、`result=all\|success\|failure`、`limit`、`offset` |
| PATCH | `/admin/users/:userId/status` | 启用或停用用户；停用会撤销该用户全部有效会话 |

用户状态写操作限制为每分钟 20 次，并写入 `admin.user_status_updated` 审计事件，记录目标用户、变更前后状态和环境管理员标识。返回数据不包含密码哈希、会话 Token、审计 metadata 或其他管理密钥。

产品创建请求中的 `image` 必须已经由 Admin 浏览器转换为最长边不超过 1280px、文件不超过 700 KiB 的 WebP。后端只校验 Base64 长度、WebP 文件签名和 SHA-256 摘要后保存，不负责解码、旋转、缩放或压缩。创建和更新分别限制为每分钟 10 次和 20 次，并记录 `admin.product_created` / `admin.product_updated` 成功或失败审计。

`manualUrl` 为可选字段：可以不传、传空字符串，或填写 `http://` / `https://` 网页地址。留空时数据库保存空字符串，API 产品响应省略 `manualUrl`；App 只有在当前账户至少一个箱子的产品配置了说明书时，才展示说明书入口。

```json
{
  "sku": "BG5163-BK",
  "model": "BG5163",
  "name": "32 位钥匙柜",
  "color": "黑色",
  "capacity": 32,
  "description": "产品说明",
  "manualUrl": "https://example.com/manual",
  "image": {
    "data": "<preprocessed-webp-base64>",
    "mimeType": "image/webp",
    "byteSize": 182400,
    "width": 960,
    "height": 1280,
    "sha256": "<64-lowercase-hex-characters>"
  }
}
```

SKU 在创建时转为大写，创建后没有修改或删除接口；产品二维码格式仍为 `uniclife://cabinet/v1/init/<SKU>/<PRODUCT_CODE>`，随机码只生成一次。更新请求不接受 SKU 或二维码，并携带 `expectedVersion` 做乐观并发控制。已有任一柜体使用产品后，容量不可修改并返回 HTTP 409 / `PRODUCT_CAPACITY_LOCKED`；图片、名称、型号、颜色、描述和可选说明书地址仍可修改。

`GET /products/:productId/image?v=<version>` 是无需用户会话的产品 WebP 图片读取接口，供扫码结果和柜体页面展示。响应包含内容摘要 ETag；匹配当前 `v` 的 URL 可长期 immutable 缓存，无版本 URL 只短期缓存。图片更新会递增 URL 的 `v`，客户端因此不会继续显示旧图。

`GET /admin/users/:userId` 仅接受管理服务端令牌，不接受普通用户会话。路径中的 `userId` 必须是 1–128 字符的有效实体 ID；用户不存在或已删除时返回 HTTP 404 / `USER_NOT_FOUND`。响应中的 `cabinets` 只包含目标用户当前有效绑定的柜体，`administrators` 只包含该柜体当前有效且未删除的管理员账户。

```json
{
  "code": "OK",
  "message": "ok",
  "data": {
    "user": {
      "id": "user-example",
      "email": "person@example.com",
      "displayName": "Example Person",
      "locale": "zh-CN",
      "status": "active",
      "loginCount": 8,
      "lastLoginAt": "2026-09-02T03:20:00.000Z",
      "createdAt": "2026-08-20T08:00:00.000Z",
      "cabinetCount": 1,
      "activeSessionCount": 2
    },
    "cabinets": [
      {
        "id": "cabinet-example",
        "name": "前台钥匙柜",
        "location": "一楼前台",
        "timeZone": "Asia/Shanghai",
        "status": "online",
        "lastSyncedAt": "2026-09-02T03:19:30.000Z",
        "createdAt": "2026-08-21T08:00:00.000Z",
        "version": 12,
        "membership": {
          "role": "admin",
          "joinedAt": "2026-08-22T08:00:00.000Z"
        },
        "product": {
          "sku": "BG5163-BK",
          "model": "BG5163",
          "name": "智能钥匙柜",
          "color": "black",
          "capacity": 16
        },
        "keyCount": 9,
        "borrowedKeyCount": 2,
        "administrators": [
          {
            "id": "user-owner",
            "displayName": "Owner",
            "email": "owner@example.com",
            "status": "active",
            "role": "super_admin",
            "joinedAt": "2026-08-21T08:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

反馈请求由后端从会话读取用户 ID、用户名和登录邮箱，客户端不能覆盖这些身份字段。邮件主题包含唯一反馈编号，正文包含身份信息与提交时间，`Reply-To` 使用登录邮箱。反馈类型为 `product` 或 `application`（默认）；称呼与标题可选，内容必填且最多 5000 字符。最多附带 5 张 JPEG 图片，每张 Base64 数据最多 2,000,000 字符；前端会先缩放和压缩。初次提交限制为每个客户端每小时 5 次，成功或失败均写入审计；邮件未配置返回 `FEEDBACK_UNAVAILABLE`，SMTP 发送失败返回 `FEEDBACK_SEND_FAILED`。

每次提交会原子创建根反馈和首条用户消息。根反馈保存身份快照、初始邮件状态、`waiting_for_support|waiting_for_user|resolved` 会话状态和最后消息时间；消息保存发送方、正文、图片数量、`sending|sent|failed` 邮件状态、失败码及已读时间。图片 Base64 和附件文件不写入数据库。用户列表、详情、回复和已读均按当前会话用户 ID 在 SQL 层过滤。客服管理接口只能通过 `ADMIN_API_TOKEN` 调用，回复成功后记录 `admin.feedback_replied` 审计，并向反馈所属用户发送仅含反馈 ID 的实时事件。

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
      "deliveredAt": "2026-08-24T08:00:01.000Z",
      "conversationStatus": "waiting_for_support",
      "lastMessageAt": "2026-08-24T08:00:00.000Z",
      "lastMessagePreview": "点击确认归还后显示网络错误。",
      "lastMessageSender": "user",
      "latestSupportMessageAt": null,
      "latestSupportMessagePreview": null,
      "messageCount": 1,
      "supportMessageCount": 0,
      "unreadMessageCount": 0
    }
  ]
}
```

用户和客服回复请求都只接受正文：

```json
{
  "content": "我已经按建议重启，当前状态仍显示离线。"
}
```

用户回复会先写入会话并将状态切为 `waiting_for_support`；客服回复将状态切为 `waiting_for_user`，写入后尝试向用户邮箱投递。后续邮件投递失败只把该消息标记为 `failed`，App 内消息仍可读取和回复。

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
| DELETE | `/cabinets/:cabinetId/keys` | 仅超级管理员可永久删除柜内全部钥匙资料；有效借用标记为 cancelled，并保留历史引用和事件 |
| POST | `/cabinets/:cabinetId/keys` | 在空槽位创建钥匙 |
| PATCH | `/keys/:keyId` | 更新钥匙名称或备注 |
| DELETE | `/keys/:keyId` | 删除单把钥匙；存在有效借用时拒绝 |
| POST | `/keys/:keyId/checkout` | 领取钥匙并创建有效借用和事件 |
| POST | `/keys/:keyId/return` | 归还钥匙并关闭有效借用 |

产品初始化码格式为 `uniclife://cabinet/v1/init/<SKU>/<PRODUCT_CODE>`。同一 SKU 使用同一个可批量印刷的码；每次用户重新扫码会生成新的 `requestId` 并创建独立柜体。同一扫码会话的网络重试必须复用 `requestId`，避免超时重试创建重复柜体。

柜体加入码格式为 `uniclife://cabinet/v1/join/<OPAQUE_TOKEN>`，只由已绑定成员在箱子设置页生成。Token 使用密码学安全随机数，数据库只保存带服务端 pepper 的摘要；二维码十分钟过期、单次使用，生成新码会撤销旧码。日志、业务事件和审计 metadata 均不得保存 Token 原文。

除初始化和加入外，柜体写请求可携带 `expectedVersion`。服务端使用条件更新保证版本一致，冲突时整个事务回滚并返回当前版本。

当前账户从箱子“设置”页底部删除箱子时，前端按当前成员角色选择接口：普通管理员调用 `DELETE /cabinets/:cabinetId/membership`，只停用自己的成员关系；超级管理员调用 `DELETE /cabinets/:cabinetId`，永久删除整个箱子和所有关联信息。两种操作都必须携带可复用的 `requestId` 与 `expectedVersion`。硬删除会清理旧箱子审计，但额外保留一条不含敏感明文的 `cabinets.deleted` 全局审计，记录删除者和聚合数量。

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

客服回复落库后，只向反馈所属用户发送：

```json
{
  "type": "support.message_created",
  "eventId": "realtime-uuid",
  "occurredAt": "2026-09-02T08:00:00.000Z",
  "feedbackId": "feedback-uuid"
}
```

通知不是数据源；客户端通过 REST 重新验证数据，客服事件不包含正文或用户身份。服务端每 45 秒发送协议级 Ping，连续一个检查周期未收到 Pong 时终止连接。退出、改密、重置密码或删号会立即关闭已撤销会话的连接。

## 主要业务错误码

- `SESSION_REQUIRED`、`SESSION_EXPIRED`
- `EMAIL_ALREADY_REGISTERED`、`INVALID_CREDENTIALS`
- `RESET_CHALLENGE_INVALID`、`RESET_CODE_INVALID`
- `FEEDBACK_UNAVAILABLE`、`FEEDBACK_SEND_FAILED`
- `PRODUCT_NOT_FOUND`、`PRODUCT_CAPACITY_LOCKED`、`PRODUCT_VERSION_CONFLICT`
- `PRODUCT_IMAGE_SIZE_INVALID`、`PRODUCT_IMAGE_FORMAT_INVALID`、`PRODUCT_IMAGE_HASH_INVALID`、`PRODUCT_IMAGE_VERSION_NOT_FOUND`
- `QR_NOT_FOUND`、`QR_DISABLED`
- `JOIN_INVITATION_NOT_FOUND`、`JOIN_INVITATION_REVOKED`、`JOIN_INVITATION_USED`、`JOIN_INVITATION_EXPIRED`、`JOIN_INVITATION_INVALID`
- `MEMBERSHIP_REQUIRED`、`MEMBER_NOT_FOUND`
- `SUPER_ADMIN_REQUIRED`、`SUPER_ADMIN_PROTECTED`、`SUPER_ADMIN_TRANSFER_REQUIRED`、`SUPER_ADMIN_TRANSFER_TARGET_INVALID`
- `SLOT_NOT_FOUND`、`SLOT_OCCUPIED`
- `KEY_NOT_FOUND`、`KEY_NOT_AVAILABLE`、`KEY_NOT_BORROWED`
- `ACTIVE_LOAN_NOT_FOUND`、`ACTIVE_LOANS_BLOCK_CLEAR`
- `EXPECTED_RETURN_INVALID`、`VERSION_CONFLICT`、`REQUEST_IN_PROGRESS`

请求/响应的稳定字段和校验 schema 定义在 `shared/src`；字段变化必须先改共享契约，再同步前端适配器和本文档。

## 并发一致性补充

- 同柜体写事务按“柜体 → 钥匙/借用/成员/加入码”顺序取得锁；`expectedVersion` 用于检测过期界面，不替代数据库一致性保护。
- 同槽位并发新增返回 `409/SLOT_OCCUPIED` 或 `409/RESOURCE_CONFLICT`，不会把数据库唯一约束冲突暴露为 500。
- 柜体详情在只读 repeatable-read 事务中返回柜体版本、钥匙、指标和全量 `activeLoans`。客户端必须使用这些活动借用，不能从最多 200 条的历史列表推断全部活动状态。
- `/auth/password-resets` 在 SMTP 与开发验证码预览均未配置时返回 `503/PASSWORD_RESET_UNAVAILABLE`；SMTP 投递失败返回 `503/PASSWORD_RESET_DELIVERY_FAILED`，对应挑战失效并记录失败审计。正常响应、请求字段和验证码有效期保持不变。


## 健康检查与部署版本

`GET /api/v1/health` 不要求身份认证。成功时为 HTTP 200 / `OK`，`data` 包含 `service: "uniclife-keycabinet-backend"`、`status: "ok"`。在 Render 提供有效 Git SHA 时，另返回可选的 `revision`（40 位提交 SHA）；客户端必须兼容该字段缺省。共享契约为 `healthStatusSchema`。数据库查询失败仍走统一错误处理，不返回健康成功。

部署核验应将 `data.revision` 与刚推送的提交比较，避免把旧实例的 HTTP 200 当作新版已发布。该字段只公开提交标识，不公开环境变量或配置明文。
