const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Shanghai',
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '尚未登录';
}

export function formatTrendDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

const actionLabels: Record<string, string> = {
  'auth.register': '注册账户',
  'auth.sign_in': '账户登录',
  'auth.sign_out': '退出登录',
  'admin.user_status_updated': '更新用户状态',
  'users.profile_updated': '更新资料',
  'users.email_updated': '更新邮箱',
  'users.password_changed': '修改密码',
  'users.account_deleted': '删除账户',
  'cabinets.initialized': '初始化钥匙柜',
  'keys.checked_out': '领取钥匙',
  'keys.returned': '归还钥匙',
};

export function formatAction(action: string): string {
  return actionLabels[action] ?? action.replaceAll('.', ' · ');
}
