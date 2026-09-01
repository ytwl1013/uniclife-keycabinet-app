import { adminUserListSchema, adminUserQuerySchema } from '@uniclife/shared';
import { Avatar, Button, Card, Input } from '@heroui/react';
import { Search, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';

import { ErrorState, TableEmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { UserStatusChip } from '@/components/status-chip';
import { UserStatusButton } from '@/components/user-status-button';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '用户管理' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const query = adminUserQuerySchema.parse({
    query: first(raw.query),
    status: first(raw.status),
    limit: 20,
    offset: first(raw.offset),
  });
  const apiSearch = new URLSearchParams({
    query: query.query,
    status: query.status,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  const result = await safeAdminApi(`/users?${apiSearch.toString()}`, adminUserListSchema);
  const environment = getAdminEnvironmentName();
  const currentSearch = new URLSearchParams();
  if (query.query) currentSearch.set('query', query.query);
  if (query.status !== 'all') currentSearch.set('status', query.status);

  if (!result.data) {
    return (
      <>
        <PageHeader description="查看账户使用情况，并执行基础的启用或停用管理。" environment={environment} title="用户管理" />
        <ErrorState message={result.error ?? '管理数据加载失败'} />
      </>
    );
  }
  const data = result.data;

  return (
    <>
      <PageHeader description="查看账户使用情况，并执行基础的启用或停用管理。" environment={environment} title="用户管理" />
      <Card className="admin-card overflow-hidden">
        <Card.Header className="border-b border-zinc-100 px-5 py-4">
          <form className="flex w-full items-center gap-3 max-sm:flex-col" method="get">
            <div className="relative min-w-0 flex-1 max-sm:w-full">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={15} />
              <Input
                aria-label="搜索用户"
                className="h-10 w-full pl-9"
                defaultValue={query.query}
                maxLength={128}
                name="query"
                placeholder="搜索姓名或邮箱"
              />
            </div>
            <select
              aria-label="筛选用户状态"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-600 outline-none focus:border-blue-400 max-sm:w-full"
              defaultValue={query.status}
              name="status"
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已停用</option>
            </select>
            <Button className="h-10 max-sm:w-full" type="submit" variant="primary">
              <Search aria-hidden="true" size={14} /> 查询
            </Button>
          </form>
        </Card.Header>

        {data.items.length ? (
          <>
            <div className="soft-scrollbar overflow-x-auto">
              <table className="data-table min-w-[920px]">
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>状态</th>
                    <th>登录情况</th>
                    <th>关联柜体</th>
                    <th>注册时间</th>
                    <th className="text-right">管理</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar color="accent" size="sm" variant="soft">
                            <Avatar.Fallback>{user.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block max-w-56 truncate text-xs font-semibold text-zinc-800">{user.displayName}</span>
                            <span className="block max-w-56 truncate text-[11px] text-zinc-400">{user.email}</span>
                          </span>
                        </div>
                      </td>
                      <td><UserStatusChip status={user.status} /></td>
                      <td>
                        <span className="block text-xs font-medium text-zinc-700">{user.loginCount} 次</span>
                        <span className="mt-0.5 block text-[10px] text-zinc-400">最近：{formatDateTime(user.lastLoginAt)}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                          <UsersRound aria-hidden="true" className="text-zinc-400" size={14} /> {user.cabinetCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-zinc-400">{formatDateTime(user.createdAt)}</td>
                      <td><UserStatusButton displayName={user.displayName} status={user.status} userId={user.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              basePath="/users"
              limit={data.limit}
              offset={data.offset}
              searchParams={currentSearch}
              total={data.total}
            />
          </>
        ) : (
          <TableEmptyState message="没有找到符合当前条件的用户" />
        )}
      </Card>
    </>
  );
}
