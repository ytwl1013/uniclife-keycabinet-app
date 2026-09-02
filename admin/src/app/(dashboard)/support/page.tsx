import { adminFeedbackListSchema, adminFeedbackQuerySchema } from '@uniclife/shared';
import { Button, Card, Input } from '@heroui/react';
import { ChevronRight, MessageCircle, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ErrorState, TableEmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '客服反馈' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const statusLabel = {
  waiting_for_support: '待客服回复',
  waiting_for_user: '待用户回复',
  resolved: '已结束',
} as const;

const statusStyle = {
  waiting_for_support: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  waiting_for_user: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  resolved: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15',
} as const;

export default async function SupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const query = adminFeedbackQuerySchema.parse({
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
  const result = await safeAdminApi(`/feedback?${apiSearch.toString()}`, adminFeedbackListSchema);
  const environment = getAdminEnvironmentName();
  const currentSearch = new URLSearchParams();
  if (query.query) currentSearch.set('query', query.query);
  if (query.status !== 'all') currentSearch.set('status', query.status);

  if (!result.data) {
    return (
      <>
        <PageHeader description="查看用户反馈、接续邮件，并在同一会话中双向回复。" environment={environment} title="客服反馈" />
        <ErrorState message={result.error ?? '客服反馈加载失败'} retryHref="/support" />
      </>
    );
  }
  const data = result.data;

  return (
    <>
      <PageHeader description="查看用户反馈、接续邮件，并在同一会话中双向回复。" environment={environment} title="客服反馈" />
      <Card className="admin-card overflow-hidden">
        <Card.Header className="border-b border-zinc-100 px-5 py-4">
          <form className="flex w-full items-center gap-3 max-sm:flex-col" method="get">
            <div className="relative min-w-0 flex-1 max-sm:w-full">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={15} />
              <Input
                aria-label="搜索客服反馈"
                className="h-10 w-full pl-9"
                defaultValue={query.query}
                maxLength={128}
                name="query"
                placeholder="搜索编号、标题、内容、用户或邮箱"
              />
            </div>
            <select
              aria-label="筛选客服状态"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-600 outline-none focus:border-blue-400 max-sm:w-full"
              defaultValue={query.status}
              name="status"
            >
              <option value="all">全部状态</option>
              <option value="waiting_for_support">待客服回复</option>
              <option value="waiting_for_user">待用户回复</option>
              <option value="resolved">已结束</option>
            </select>
            <Button className="h-10 max-sm:w-full" type="submit" variant="primary">
              <Search aria-hidden="true" size={14} /> 查询
            </Button>
          </form>
        </Card.Header>

        {data.items.length ? (
          <>
            <div className="soft-scrollbar overflow-x-auto">
              <table className="data-table min-w-[1040px]">
                <thead>
                  <tr>
                    <th>状态</th>
                    <th>反馈与用户</th>
                    <th>最新消息</th>
                    <th>会话</th>
                    <th>更新时间</th>
                    <th className="text-right">处理</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusStyle[item.conversationStatus]}`}>
                          {statusLabel[item.conversationStatus]}
                        </span>
                      </td>
                      <td>
                        <span className="block max-w-64 truncate text-xs font-semibold text-zinc-800">
                          {item.title || '未填写标题'}
                        </span>
                        <span className="mt-1 block max-w-64 truncate text-[10px] text-zinc-400">
                          {item.userDisplayName} · {item.userEmail}
                        </span>
                        <span className="mt-1 block max-w-64 truncate font-mono text-[9px] text-zinc-400">
                          {item.id}
                        </span>
                      </td>
                      <td>
                        <span className="block max-w-80 truncate text-xs text-zinc-600">
                          {item.lastMessagePreview}
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-400">
                          {item.lastMessageSender === 'support' ? '客服回复' : '用户回复'}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                          <MessageCircle aria-hidden="true" size={14} /> {item.messageCount} 条
                        </span>
                        {item.unreadMessageCount > 0 ? (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            {item.unreadMessageCount} 条未读
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap text-zinc-400">{formatDateTime(item.lastMessageAt)}</td>
                      <td>
                        <Link
                          className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          href={`/support/${encodeURIComponent(item.id)}`}
                        >
                          查看并回复 <ChevronRight aria-hidden="true" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              basePath="/support"
              limit={data.limit}
              offset={data.offset}
              searchParams={currentSearch}
              total={data.total}
            />
          </>
        ) : (
          <TableEmptyState message="没有找到符合当前条件的客服反馈" />
        )}
      </Card>
    </>
  );
}
