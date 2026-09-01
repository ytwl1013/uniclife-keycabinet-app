'use client';

import { Button } from '@heroui/react';
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { BrandMark } from './brand-mark';

const navigation = [
  { href: '/', label: '概览', icon: LayoutDashboard },
  { href: '/users', label: '用户管理', icon: Users },
  { href: '/activity', label: '活动记录', icon: Activity },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logOut() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[238px] flex-col border-r border-zinc-200/80 bg-white/92 px-4 py-5 backdrop-blur-xl max-md:static max-md:w-full max-md:border-b max-md:border-r-0 max-md:px-4 max-md:py-3">
      <div className="px-2 max-md:hidden">
        <BrandMark />
      </div>
      <div className="hidden items-center justify-between max-md:flex">
        <BrandMark />
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
          安全会话
        </span>
      </div>

      <nav aria-label="后台主导航" className="mt-9 space-y-1.5 max-md:mt-4 max-md:flex max-md:gap-1 max-md:overflow-x-auto max-md:pb-1">
        {navigation.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors max-md:min-w-max ${
                active
                  ? 'bg-zinc-900 text-white shadow-[0_8px_18px_rgba(24,24,27,0.12)]'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              href={item.href}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
              <ChevronRight
                aria-hidden="true"
                className={`ml-auto max-md:hidden ${active ? 'opacity-70' : 'opacity-0 group-hover:opacity-40'}`}
                size={14}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 max-md:hidden">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-900">
            <ShieldCheck aria-hidden="true" size={16} />
            服务端安全模式
          </div>
          <p className="text-[11px] leading-5 text-blue-700/75">管理密钥不会发送到浏览器，写操作均保留审计记录。</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="grid size-8 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">AD</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-zinc-800">管理员</span>
            <span className="block truncate text-[10px] text-zinc-400">{username}</span>
          </span>
          <Button
            aria-label="退出登录"
            className="size-8 min-w-8"
            isDisabled={isLoggingOut}
            isIconOnly
            onPress={logOut}
            size="sm"
            variant="ghost"
          >
            <LogOut aria-hidden="true" size={15} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
