import { Card, Chip } from '@heroui/react';
import { CheckCircle2, Code2, Cookie, DatabaseZap, KeyRound, LockKeyhole, ServerCog, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { getAdminEnvironmentName } from '@/lib/env';

export const metadata: Metadata = { title: '系统设置' };

const securityItems = [
  { icon: LockKeyhole, title: '密码哈希', detail: '管理员密码使用 bcrypt cost 12 校验，不保存明文。' },
  { icon: Cookie, title: '安全会话', detail: 'HttpOnly、SameSite=Strict；生产环境强制 Secure。' },
  { icon: KeyRound, title: '服务端令牌', detail: '后端管理令牌不会进入浏览器或 NEXT_PUBLIC 变量。' },
  { icon: ShieldCheck, title: '请求防护', detail: '同源检查、登录限流、安全响应头与内容安全策略。' },
];

export default function SettingsPage() {
  const environment = getAdminEnvironmentName();
  return (
    <>
      <PageHeader description="查看当前连接环境和管理后台的安全配置。敏感值不会在页面中展示。" environment={environment} title="系统设置" />
      <section className="grid grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] gap-5 max-lg:grid-cols-1">
        <Card className="admin-card">
          <Card.Header className="flex items-start justify-between px-5 pb-0 pt-5">
            <div>
              <Card.Title className="text-sm font-semibold text-zinc-900">API 环境</Card.Title>
              <Card.Description className="mt-1 text-xs text-zinc-400">通过 APP_ENV 在两套服务地址间切换</Card.Description>
            </div>
            <Chip color={environment === 'dev' ? 'accent' : 'success'} size="sm" variant="soft">
              <CheckCircle2 aria-hidden="true" className="mr-1" size={12} /> 已选择
            </Chip>
          </Card.Header>
          <Card.Content className="px-5 pb-5 pt-6">
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div className={`rounded-2xl border p-4 ${environment === 'dev' ? 'border-blue-200 bg-blue-50/70' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-2">
                  <DatabaseZap aria-hidden="true" className={environment === 'dev' ? 'text-blue-600' : 'text-zinc-400'} size={18} />
                  <span className="text-sm font-semibold text-zinc-800">本地开发</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">APP_ENV=dev</p>
                <code className="mt-3 block rounded-lg bg-white/80 px-2.5 py-2 text-[10px] text-zinc-500">API_BASE_URL_DEV</code>
              </div>
              <div className={`rounded-2xl border p-4 ${environment === 'pro' ? 'border-emerald-200 bg-emerald-50/70' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-2">
                  <ServerCog aria-hidden="true" className={environment === 'pro' ? 'text-emerald-600' : 'text-zinc-400'} size={18} />
                  <span className="text-sm font-semibold text-zinc-800">Render 生产后端</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">APP_ENV=pro（强制 HTTPS）</p>
                <code className="mt-3 block rounded-lg bg-white/80 px-2.5 py-2 text-[10px] text-zinc-500">API_BASE_URL_PRO</code>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <Code2 aria-hidden="true" className="mt-0.5 text-violet-600" size={18} />
                <div>
                  <p className="text-xs font-semibold text-zinc-700">切换命令</p>
                  <div className="mt-2 space-y-1.5 font-mono text-[11px] text-zinc-500">
                    <p>pnpm dev:admin</p>
                    <p>pnpm pro:admin</p>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card className="admin-card">
          <Card.Header className="px-5 pb-0 pt-5">
            <Card.Title className="text-sm font-semibold text-zinc-900">安全状态</Card.Title>
            <Card.Description className="mt-1 text-xs text-zinc-400">当前实现的基础网络安全措施</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3 px-5 pb-5 pt-5">
            {securityItems.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex gap-3 rounded-2xl bg-zinc-50 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <Icon aria-hidden="true" size={16} />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-zinc-700">{title}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-zinc-400">{detail}</span>
                </span>
              </div>
            ))}
          </Card.Content>
        </Card>
      </section>
    </>
  );
}
