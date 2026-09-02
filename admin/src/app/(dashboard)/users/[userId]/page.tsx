import { adminUserDetailSchema, type AdminUserCabinet } from '@uniclife/shared';
import { Avatar, Card, Chip } from '@heroui/react';
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Clock3,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  MonitorCheck,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ErrorState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { UserStatusChip } from '@/components/status-chip';
import { UserStatusButton } from '@/components/user-status-button';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '用户详情' };

const cabinetStatusLabels = {
  online: '在线',
  offline: '离线',
  maintenance: '维护中',
} as const;

const cabinetStatusColors = {
  online: 'success',
  offline: 'default',
  maintenance: 'warning',
} as const;

function CabinetStatusChip({ status }: { status: AdminUserCabinet['status'] }) {
  return (
    <Chip color={cabinetStatusColors[status]} size="sm" variant="soft">
      <span
        className={`mr-1.5 inline-block size-1.5 rounded-full ${
          status === 'online' ? 'bg-emerald-500' : status === 'maintenance' ? 'bg-amber-500' : 'bg-zinc-400'
        }`}
      />
      {cabinetStatusLabels[status]}
    </Chip>
  );
}

function RoleChip({ role }: { role: 'super_admin' | 'admin' }) {
  return (
    <Chip color={role === 'super_admin' ? 'accent' : 'default'} size="sm" variant="soft">
      {role === 'super_admin' ? '超级管理员' : '管理员'}
    </Chip>
  );
}

function CabinetCard({ cabinet, selectedUserId }: { cabinet: AdminUserCabinet; selectedUserId: string }) {
  const occupancyRate = Math.min(100, Math.round((cabinet.keyCount / cabinet.product.capacity) * 100));

  return (
    <Card className="admin-card min-w-0 overflow-hidden">
      <Card.Header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-blue-50 text-blue-600">
            <Box aria-hidden="true" size={18} />
          </span>
          <div className="min-w-0">
            <Card.Title className="truncate text-sm font-semibold text-zinc-900">{cabinet.name}</Card.Title>
            <Card.Description className="mt-1 flex items-center gap-1 truncate text-[11px] text-zinc-400">
              <MapPin aria-hidden="true" className="shrink-0" size={12} />
              {cabinet.location || '未设置位置'}
            </Card.Description>
          </div>
        </div>
        <CabinetStatusChip status={cabinet.status} />
      </Card.Header>

      <Card.Content className="p-5">
        <div className="grid grid-cols-2 gap-3 text-xs max-sm:grid-cols-1">
          <div className="rounded-2xl bg-zinc-50 p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">产品型号</p>
            <p className="mt-1.5 font-semibold text-zinc-800">{cabinet.product.model}</p>
            <p className="mt-0.5 truncate text-[10px] text-zinc-400" title={`${cabinet.product.sku} · ${cabinet.product.color}`}>
              {cabinet.product.name} · {cabinet.product.sku} · {cabinet.product.color}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">钥匙占用</p>
              <span className="text-[10px] text-zinc-400">{occupancyRate}%</span>
            </div>
            <p className="mt-1.5 font-semibold text-zinc-800">
              {cabinet.keyCount} / {cabinet.product.capacity} 把
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] text-zinc-400"><KeyRound aria-hidden="true" size={11} /> 已借出</p>
            <p className="mt-1 text-sm font-semibold text-zinc-800">{cabinet.borrowedKeyCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] text-zinc-400"><UsersRound aria-hidden="true" size={11} /> 管理员</p>
            <p className="mt-1 text-sm font-semibold text-zinc-800">{cabinet.administrators.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] text-zinc-400"><RefreshCw aria-hidden="true" size={11} /> 数据版本</p>
            <p className="mt-1 text-sm font-semibold text-zinc-800">v{cabinet.version}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-zinc-100 py-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <RefreshCw aria-hidden="true" className="text-zinc-400" size={12} />
            同步于 {formatDateTime(cabinet.lastSyncedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 aria-hidden="true" className="text-zinc-400" size={12} />
            {cabinet.timeZone}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="text-zinc-400" size={12} />
            绑定于 {formatDateTime(cabinet.membership.joinedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="text-zinc-400" size={12} />
            创建于 {formatDateTime(cabinet.createdAt)}
          </span>
          <span className="max-w-full truncate font-mono text-[10px] text-zinc-400" title={cabinet.id}>ID: {cabinet.id}</span>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-zinc-800">已绑定管理员</h3>
              <p className="mt-0.5 text-[10px] text-zinc-400">当前用户在此柜体中为 {cabinet.membership.role === 'super_admin' ? '超级管理员' : '管理员'}</p>
            </div>
            <RoleChip role={cabinet.membership.role} />
          </div>
          <ul className="space-y-2">
            {cabinet.administrators.map((administrator) => {
              const selected = administrator.id === selectedUserId;
              return (
                <li
                  key={administrator.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${selected ? 'border-blue-100 bg-blue-50/70' : 'border-zinc-100 bg-white'}`}
                >
                  <Avatar color={selected ? 'accent' : 'default'} size="sm" variant="soft">
                    <Avatar.Fallback>{administrator.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        className="truncate text-xs font-semibold text-zinc-800 hover:text-blue-700"
                        href={`/users/${encodeURIComponent(administrator.id)}`}
                      >
                        {administrator.displayName}
                      </Link>
                      {selected && <span className="shrink-0 text-[10px] font-medium text-blue-600">当前查看</span>}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-400">{administrator.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RoleChip role={administrator.role} />
                    {administrator.status === 'disabled' && <span className="text-[10px] text-red-500">账户已停用</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card.Content>
    </Card>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const result = await safeAdminApi(`/users/${encodeURIComponent(userId)}`, adminUserDetailSchema);
  const environment = getAdminEnvironmentName();

  if (!result.data) {
    return (
      <>
        <PageHeader
          actions={
            <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50" href="/users">
              <ArrowLeft aria-hidden="true" size={14} /> 返回用户列表
            </Link>
          }
          description="查看账户、会话及所绑定柜体的管理员关系。"
          environment={environment}
          title="用户详情"
        />
        <ErrorState message={result.error ?? '用户详情加载失败'} retryHref={`/users/${encodeURIComponent(userId)}`} />
      </>
    );
  }

  const { user, cabinets } = result.data;
  return (
    <>
      <PageHeader
        actions={
          <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50" href="/users">
            <ArrowLeft aria-hidden="true" size={14} /> 返回用户列表
          </Link>
        }
        description="查看账户、会话及所绑定柜体的管理员关系。"
        environment={environment}
        title="用户详情"
      />

      <Card className="admin-card overflow-hidden">
        <Card.Content className="p-5 sm:p-6">
          <div className="flex items-start gap-4 max-sm:flex-col">
            <Avatar className="size-16 shrink-0 text-xl" color="accent" variant="soft">
              <Avatar.Fallback>{user.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-950">{user.displayName}</h2>
                <UserStatusChip status={user.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5"><Mail aria-hidden="true" size={13} /> {user.email}</span>
                <span className="flex items-center gap-1.5"><Globe2 aria-hidden="true" size={13} /> {user.locale}</span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">ID: {user.id}</span>
              </div>
            </div>
            <UserStatusButton displayName={user.displayName} status={user.status} userId={user.id} />
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {[
              { label: '关联柜体', value: user.cabinetCount, note: '当前有效绑定', icon: Box, color: 'bg-blue-50 text-blue-600' },
              { label: '活跃会话', value: user.activeSessionCount, note: '未撤销且未过期', icon: MonitorCheck, color: 'bg-emerald-50 text-emerald-600' },
              { label: '累计登录', value: user.loginCount, note: `最近：${formatDateTime(user.lastLoginAt)}`, icon: ShieldCheck, color: 'bg-violet-50 text-violet-600' },
              { label: '注册时间', value: formatDateTime(user.createdAt), note: '账户创建时间', icon: Clock3, color: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, note, icon: Icon, color }) => (
              <div key={label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${color}`}><Icon aria-hidden="true" size={16} /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-800">{value}</p>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-400" title={note}>{note}</p>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">关联柜体</h2>
            <p className="mt-1 text-xs text-zinc-400">柜体状态、钥匙使用情况及全部有效管理员</p>
          </div>
          <span className="text-xs text-zinc-400">共 {cabinets.length} 个</span>
        </div>

        {cabinets.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28rem),1fr))] items-start gap-5">
            {cabinets.map((cabinet) => <CabinetCard key={cabinet.id} cabinet={cabinet} selectedUserId={user.id} />)}
          </div>
        ) : (
          <Card className="admin-card">
            <Card.Content className="grid min-h-52 place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-zinc-100 text-zinc-400"><Box aria-hidden="true" size={19} /></span>
                <p className="mt-3 text-sm font-medium text-zinc-700">尚未绑定钥匙柜</p>
                <p className="mt-1 text-xs text-zinc-400">该用户当前没有有效的柜体管理员关系。</p>
              </div>
            </Card.Content>
          </Card>
        )}
      </section>
    </>
  );
}
