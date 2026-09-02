import { adminOverviewSchema, type AdminActivity } from '@uniclife/shared';
import { Avatar, Card, Chip } from '@heroui/react';
import {
  Activity,
  ArrowUpRight,
  CircleCheck,
  Clock3,
  MonitorCheck,
  Server,
  UserPlus,
  Users,
} from 'lucide-react';

import { ErrorState, TableEmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ResultChip } from '@/components/status-chip';
import { safeAdminApi } from '@/lib/admin-api';
import { formatAction, formatDateTime, formatTrendDate } from '@/lib/format';
import { getAdminEnvironmentName } from '@/lib/env';

const metricCards = [
  { key: 'totalUsers', label: '用户总数', helper: '全部有效账户', icon: Users, color: 'blue' },
  { key: 'newUsersLast7Days', label: '近 7 日新增', helper: '新注册用户', icon: UserPlus, color: 'violet' },
  { key: 'activeSessions', label: '活跃会话', helper: '未撤销且有效', icon: MonitorCheck, color: 'emerald' },
  { key: 'totalCabinets', label: '钥匙柜', helper: '已初始化设备', icon: Server, color: 'amber' },
] as const;

const metricColor = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
};

function ActivityChart({ trend }: { trend: { date: string; count: number }[] }) {
  const max = Math.max(1, ...trend.map((item) => item.count));
  const total = trend.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card className="admin-card min-w-0">
      <Card.Header className="flex items-start justify-between px-5 pb-0 pt-5">
        <div>
          <Card.Title className="text-sm font-semibold text-zinc-900">活动趋势</Card.Title>
          <Card.Description className="mt-1 text-xs text-zinc-400">最近 7 天审计事件</Card.Description>
        </div>
        <Chip color="accent" size="sm" variant="soft">
          {total} 次操作
        </Chip>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-7">
        <div className="flex h-[210px] items-end gap-3 border-b border-zinc-100 px-1 max-sm:gap-1.5">
          {trend.map((item) => (
            <div key={item.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="mb-2 text-center text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                {item.count}
              </div>
              <div
                className="min-h-1 rounded-t-[7px] bg-gradient-to-t from-blue-500 to-sky-300 transition-[height,filter] duration-300 group-hover:brightness-105"
                style={{ height: `${Math.max(4, (item.count / max) * 155)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 px-1 max-sm:gap-1.5">
          {trend.map((item) => (
            <span key={item.date} className="min-w-0 flex-1 text-center text-[10px] text-zinc-400">
              {formatTrendDate(item.date)}
            </span>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

function SystemSummary({
  activeUsers,
  totalUsers,
  onlineCabinets,
  totalCabinets,
  disabledUsers,
}: {
  activeUsers: number;
  totalUsers: number;
  onlineCabinets: number;
  totalCabinets: number;
  disabledUsers: number;
}) {
  const userRate = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const onlineRate = totalCabinets ? Math.round((onlineCabinets / totalCabinets) * 100) : 0;
  return (
    <Card className="admin-card">
      <Card.Header className="px-5 pb-0 pt-5">
        <Card.Title className="text-sm font-semibold text-zinc-900">运行摘要</Card.Title>
        <Card.Description className="mt-1 text-xs text-zinc-400">账户与设备基本状态</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-5 px-5 pb-5 pt-6">
        {[
          { label: '正常用户占比', value: userRate, note: `${activeUsers}/${totalUsers}`, color: 'bg-blue-500' },
          { label: '钥匙柜在线率', value: onlineRate, note: `${onlineCabinets}/${totalCabinets}`, color: 'bg-emerald-500' },
        ].map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">{item.label}</span>
              <span className="text-zinc-400">{item.note}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl bg-zinc-50 p-3.5">
            <p className="text-[11px] text-zinc-400">停用用户</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-800">{disabledUsers}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3.5">
            <p className="text-[11px] text-emerald-700/65">服务状态</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <CircleCheck aria-hidden="true" size={15} /> 正常
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function RecentActivityTable({ activities }: { activities: AdminActivity[] }) {
  return (
    <Card className="admin-card mt-5 overflow-hidden">
      <Card.Header className="flex items-center justify-between px-5 py-4">
        <div>
          <Card.Title className="text-sm font-semibold text-zinc-900">最近活动</Card.Title>
          <Card.Description className="mt-1 text-xs text-zinc-400">系统内最新的关键操作</Card.Description>
        </div>
        <a className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700" href="/activity">
          查看全部 <ArrowUpRight aria-hidden="true" size={13} />
        </a>
      </Card.Header>
      {activities.length ? (
        <div className="soft-scrollbar overflow-x-auto border-t border-zinc-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>操作者</th>
                <th>操作</th>
                <th>对象</th>
                <th>结果</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7" size="sm">
                        <Avatar.Fallback>{activity.actor?.displayName.slice(0, 1).toUpperCase() ?? 'S'}</Avatar.Fallback>
                      </Avatar>
                      <span>
                        <span className="block text-xs font-medium text-zinc-700">{activity.actor?.displayName ?? '系统管理员'}</span>
                        <span className="block max-w-44 truncate text-[10px] text-zinc-400">{activity.actor?.email ?? 'environment_admin'}</span>
                      </span>
                    </div>
                  </td>
                  <td className="font-medium text-zinc-700">{formatAction(activity.action)}</td>
                  <td>
                    <span className="block text-xs text-zinc-600">{activity.targetType}</span>
                    <span className="block max-w-40 truncate font-mono text-[10px] text-zinc-400">{activity.targetId}</span>
                  </td>
                  <td><ResultChip result={activity.result} /></td>
                  <td className="whitespace-nowrap text-zinc-400">{formatDateTime(activity.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableEmptyState message="还没有可展示的审计事件" />
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const result = await safeAdminApi('/overview', adminOverviewSchema);
  const environment = getAdminEnvironmentName();
  if (!result.data) {
    return (
      <>
        <PageHeader description="查看用户增长、会话与设备运行情况。" environment={environment} title="管理概览" />
        <ErrorState message={result.error ?? '管理数据加载失败'} />
      </>
    );
  }
  const { metrics, activityTrend, recentActivities } = result.data;
  return (
    <>
      <PageHeader
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-sm">
            <Clock3 aria-hidden="true" size={14} />
            数据实时读取
          </div>
        }
        description="查看用户增长、会话与设备运行情况。"
        environment={environment}
        title="管理概览"
      />

      <section className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {metricCards.map(({ key, label, helper, icon: Icon, color }) => (
          <Card key={key} className="admin-card">
            <Card.Content className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{label}</p>
                  <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-zinc-950">{metrics[key]}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-[14px] ${metricColor[color]}`}>
                  <Icon aria-hidden="true" size={18} />
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Activity aria-hidden="true" size={11} /> {helper}
              </p>
            </Card.Content>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-[minmax(0,1.65fr)_minmax(280px,0.7fr)] gap-5 max-lg:grid-cols-1">
        <ActivityChart trend={activityTrend} />
        <SystemSummary
          activeUsers={metrics.activeUsers}
          disabledUsers={metrics.disabledUsers}
          onlineCabinets={metrics.onlineCabinets}
          totalCabinets={metrics.totalCabinets}
          totalUsers={metrics.totalUsers}
        />
      </section>

      <RecentActivityTable activities={recentActivities} />
    </>
  );
}
