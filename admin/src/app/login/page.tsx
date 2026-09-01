import { Card, Chip } from '@heroui/react';
import { Activity, CheckCircle2, Database, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BrandMark } from '@/components/brand-mark';
import { getAdminSession } from '@/lib/session';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: '管理员登录' };
export const dynamic = 'force-dynamic';

const features = [
  { icon: Database, title: '用户数据', detail: '状态、登录次数与柜体关联' },
  { icon: Activity, title: '活动追踪', detail: '关键操作与失败记录' },
  { icon: ShieldCheck, title: '安全管理', detail: '服务端认证与完整审计' },
];

export default async function LoginPage() {
  if (await getAdminSession()) redirect('/');

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute -left-32 top-[-15%] size-[520px] rounded-full bg-blue-200/35 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 right-[-8%] size-[520px] rounded-full bg-violet-200/25 blur-[110px]" />

      <div className="relative grid w-full max-w-[980px] grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-[30px] border border-white/80 bg-white/82 shadow-[0_35px_100px_rgba(34,47,62,0.13)] backdrop-blur-2xl max-md:max-w-md max-md:grid-cols-1">
        <section className="relative overflow-hidden bg-zinc-950 px-10 py-11 text-white max-md:hidden">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_10%,rgba(38,151,255,0.48),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(118,83,255,0.30),transparent_32%)]" />
          <div className="relative flex h-full min-h-[540px] flex-col">
            <div className="brightness-0 invert">
              <BrandMark />
            </div>
            <div className="my-auto py-12">
              <Chip className="mb-5 bg-white/10 text-white" color="default" size="sm" variant="soft">
                <Sparkles aria-hidden="true" className="mr-1" size={12} />
                简洁、安全、专注
              </Chip>
              <h1 className="max-w-sm text-[38px] font-semibold leading-[1.12] tracking-[-0.045em]">
                管理你的用户，<br />掌握每一次活动。
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                面向钥匙柜业务的轻量后台，只保留日常运营真正需要的数据与操作。
              </p>
            </div>
            <div className="grid gap-3">
              {features.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-blue-300">
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <span>
                    <span className="block text-xs font-medium">{title}</span>
                    <span className="mt-0.5 block text-[11px] text-white/45">{detail}</span>
                  </span>
                  <CheckCircle2 aria-hidden="true" className="ml-auto text-emerald-400" size={16} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center px-10 py-12 max-sm:px-6">
          <div className="w-full">
            <div className="mb-8 hidden max-md:block">
              <BrandMark />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Administrator</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-zinc-950">欢迎回来</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">请使用服务器环境中配置的管理员账户登录。</p>
            <Card className="mt-6 border-blue-100 bg-blue-50/70 shadow-none">
              <Card.Content className="flex gap-3 p-3.5">
                <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" size={17} />
                <p className="text-[11px] leading-5 text-blue-800/75">凭据只在服务端校验；连续失败会触发临时限流，登录会话不会写入浏览器存储。</p>
              </Card.Content>
            </Card>
            <LoginForm />
            <p className="mt-6 text-center text-[11px] text-zinc-400">UnicLife 管理控制台 · 仅限授权人员</p>
          </div>
        </section>
      </div>
    </main>
  );
}
