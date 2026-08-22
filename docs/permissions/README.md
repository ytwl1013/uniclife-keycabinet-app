# 权限说明

权限只在后端执行。前端隐藏按钮不构成授权。

## 当前角色模型

当前产品与前端原型一致，柜体成员只有 `admin` 一种角色。有效 Admin 可以：

- 查看柜体、槽位、钥匙、成员、借用和活动；
- 重命名柜体；
- 创建、编辑和删除钥匙；
- 领取和归还钥匙；
- 移除其他成员；
- 批量永久删除柜内钥匙资料。

用户不能移除自己的 Admin 成员关系。访问任意柜体资源前，后端通过 `cabinet_memberships.active=true` 校验成员身份；列表和活动查询也在 SQL 层按成员关系过滤。

## 共享权限码

`shared/src/schemas/permissions.ts` 保留稳定能力码，供后续组织角色扩展：

- `auth:login`
- `users:read`、`users:write`
- `cabinets:read`、`cabinets:operate`
- `keys:read`、`keys:borrow`、`keys:return`
- `records:read`、`audit:read`

`cabinets:operate`、`keys:borrow`、`keys:return` 属于高风险能力，必须保留成功/失败审计、幂等控制和明确失败原因。引入新角色时，应先更新共享权限契约、本文档和权限测试，再修改路由策略。
