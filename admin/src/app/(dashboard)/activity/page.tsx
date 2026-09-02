import { adminActivityListSchema, adminActivityQuerySchema } from '@uniclife/shared';
import { Avatar, Button, Card, Input } from '@heroui/react';
import { Search } from 'lucide-react';
import type { Metadata } from 'next';

import { ErrorState, TableEmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ResultChip } from '@/components/status-chip';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatAction, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '活动记录' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const query = adminActivityQuerySchema.parse({
    query: first(raw.query),
    result: first(raw.result),
    limit: 20,
    offset: first(raw.offset),
  });
  const apiSearch = new URLSearchParams({
    query: query.query,
    result: query.result,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  const result = await safeAdminApi(`/activities?${apiSearch.toString()}`, adminActivityListSchema);
  const environment = getAdminEnvironmentName();
  const currentSearch = new URLSearchParams();
  if (query.query) currentSearch.set('query', query.query);
  if (query.result !== 'all') currentSearch.set('result', query.result);

  if (!result.data) {
    return (
      <>
        <PageHeader description="追踪登录、用户变更和关键业务操作，便于排查异常。" environment={environment} title="活动记录" />
        <ErrorState message={result.error ?? '管理数据加载失败'} />
      </>
    );
  }
  const data = result.data;

  return (
    <>
      <PageHeader description="追踪登录、用户变更和关键业务操作，便于排查异常。" environment={environment} title="活动记录" />
      <Card className="admin-card overflow-hidden">
        <Card.Header className="border-b border-zinc-100 px-5 py-4">
          <form className="flex w-full items-center gap-3 max-sm:flex-col" method="get">
            <div className="relative min-w-0 flex-1 max-sm:w-full">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={15} />
              <Input
                aria-label="搜索活动"
                className="h-10 w-full pl-9"
                defaultValue={query.query}
                maxLength={128}
                name="query"
                placeholder="搜索操作、用户或对象 ID"
              />
            </div>
            <select
              aria-label="筛选活动结果"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-600 outline-none focus:border-blue-400 max-sm:w-full"
              defaultValue={query.result}
              name="result"
            >
              <option value="all">全部结果</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
            <Button className="h-10 max-sm:w-full" type="submit" variant="primary">
              <Search aria-hidden="true" size={14} /> 查询
            </Button>
          </form>
        </Card.Header>

        {data.items.length ? (
          <>
            <div className="soft-scrollbar overflow-x-auto">
              <table className="data-table min-w-[960px]">
                <thead>
                  <tr>
                    <th>操作者</th>
                    <th>操作</th>
                    <th>对象类型</th>
                    <th>对象 ID</th>
                    <th>结果</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar color={activity.actor ? 'accent' : 'default'} size="sm" variant="soft">
                            <Avatar.Fallback>{activity.actor?.displayName.slice(0, 1).toUpperCase() ?? 'S'}</Avatar.Fallback>
                          </Avatar>
                          <span>
                            <span className="block max-w-48 truncate text-xs font-medium text-zinc-700">{activity.actor?.displayName ?? '系统管理员'}</span>
                            <span className="block max-w-48 truncate text-[10px] text-zinc-400">{activity.actor?.email ?? 'environment_admin'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="font-medium text-zinc-700">{formatAction(activity.action)}</td>
                      <td><span className="rounded-lg bg-zinc-100 px-2 py-1 font-mono text-[10px] text-zinc-600">{activity.targetType}</span></td>
                      <td><span className="block max-w-52 truncate font-mono text-[10px] text-zinc-500" title={activity.targetId}>{activity.targetId}</span></td>
                      <td>
                        <ResultChip result={activity.result} />
                        {activity.reasonCode && <span className="ml-2 text-[10px] text-red-500">{activity.reasonCode}</span>}
                      </td>
                      <td className="whitespace-nowrap text-zinc-400">{formatDateTime(activity.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              basePath="/activity"
              limit={data.limit}
              offset={data.offset}
              searchParams={currentSearch}
              total={data.total}
            />
          </>
        ) : (
          <TableEmptyState message="没有找到符合当前条件的活动记录" />
        )}
      </Card>
    </>
  );
}
