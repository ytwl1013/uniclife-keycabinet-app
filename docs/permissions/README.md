# 权限说明

共享权限码定义位于 `shared/src/schemas/permissions.ts`。

当前初始权限：

- `auth:login`
- `users:read`
- `users:write`
- `cabinets:read`
- `cabinets:operate`
- `keys:read`
- `keys:borrow`
- `keys:return`
- `records:read`
- `audit:read`

高风险权限包括 `cabinets:operate`、`keys:borrow`、`keys:return`。这些动作必须写审计日志，并记录失败原因。
