import { feedbackThreadSchema } from '@uniclife/shared';
import { Card } from '@heroui/react';
import { ArrowLeft, ImageIcon, Mail, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ErrorState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SupportReplyForm } from '@/components/support-reply-form';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '客服会话' };

const statusLabel = {
  waiting_for_support: '待客服回复',
  waiting_for_user: '待用户回复',
  resolved: '已结束',
} as const;

export default async function SupportDetailPage({ params }: { params: Promise<{ feedbackId: string }> }) {
  const { feedbackId } = await params;
  const result = await safeAdminApi(`/feedback/${encodeURIComponent(feedbackId)}`, feedbackThreadSchema);
  const environment = getAdminEnvironmentName();

  if (!result.data) {
    return (
      <>
        <PageHeader description="查看反馈详情并继续处理。" environment={environment} title="客服会话" />
        <ErrorState message={result.error ?? '客服会话加载失败'} retryHref="/support" />
      </>
    );
  }
  const thread = result.data;

  return (
    <>
      <PageHeader
        actions={(
          <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50" href="/support">
            <ArrowLeft aria-hidden="true" size={14} /> 返回列表
          </Link>
        )}
        description={`${thread.id} · ${statusLabel[thread.conversationStatus]}`}
        environment={environment}
        title={thread.title || '未填写标题'}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-5 max-lg:grid-cols-1">
        <Card className="admin-card flex min-h-[620px] flex-col overflow-hidden">
          <Card.Header className="border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-zinc-800">会话记录</p>
              <p className="mt-1 text-xs text-zinc-400">共 {thread.messageCount} 条消息</p>
            </div>
          </Card.Header>
          <Card.Content className="soft-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-zinc-50/35 p-5">
            {thread.messages.map((message) => {
              const support = message.sender === 'support';
              return (
                <div className={`flex ${support ? 'justify-end' : 'justify-start'}`} key={message.id}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${support ? 'rounded-br-md bg-zinc-900 text-white' : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800'}`}>
                    <div className={`mb-2 flex items-center gap-2 text-[10px] ${support ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      <span className="font-semibold">{message.senderDisplayName}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    {message.imageCount ? (
                      <p className={`mt-2 flex items-center gap-1 text-[10px] ${support ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        <ImageIcon aria-hidden="true" size={12} /> 初始邮件包含 {message.imageCount} 张图片
                      </p>
                    ) : null}
                    {support && message.status === 'failed' ? (
                      <p className="mt-2 text-[10px] text-amber-300">已写入 App，邮件投递失败</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Card.Content>
          <SupportReplyForm feedbackId={thread.id} unreadCount={thread.unreadMessageCount} />
        </Card>

        <div className="space-y-5">
          <Card className="admin-card">
            <Card.Header className="border-b border-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-800">用户信息</Card.Header>
            <Card.Content className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={18} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-800">{thread.userDisplayName}</span>
                  <span className="block truncate text-xs text-zinc-400">{thread.userEmail}</span>
                </span>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 font-mono text-[10px] text-zinc-500">{thread.userId}</div>
            </Card.Content>
          </Card>

          <Card className="admin-card">
            <Card.Header className="border-b border-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-800">反馈信息</Card.Header>
            <Card.Content className="space-y-3 p-5 text-xs text-zinc-600">
              <p className="flex justify-between gap-3"><span className="text-zinc-400">类型</span><span>{thread.type === 'product' ? '产品问题' : '应用问题'}</span></p>
              <p className="flex justify-between gap-3"><span className="text-zinc-400">提交时间</span><span>{formatDateTime(thread.submittedAt)}</span></p>
              <p className="flex justify-between gap-3"><span className="text-zinc-400">图片</span><span>{thread.imageCount} 张</span></p>
              <p className="flex justify-between gap-3"><span className="text-zinc-400">初始邮件</span><span className="inline-flex items-center gap-1"><Mail size={12} />{thread.status === 'sent' ? '已发送' : thread.status === 'sending' ? '发送中' : '发送失败'}</span></p>
            </Card.Content>
          </Card>
        </div>
      </div>
    </>
  );
}
