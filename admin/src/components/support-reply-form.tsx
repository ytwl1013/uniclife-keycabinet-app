'use client';

import { Button } from '@heroui/react';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SupportReplyForm({ feedbackId, unreadCount }: { feedbackId: string; unreadCount: number }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!unreadCount) return;
    void fetch(`/api/admin/feedback/${encodeURIComponent(feedbackId)}/read`, { method: 'POST' })
      .then((response) => {
        if (response.ok) router.refresh();
      })
      .catch(() => undefined);
  }, [feedbackId, router, unreadCount]);

  async function submit() {
    const normalized = content.trim();
    if (!normalized) {
      setError('请输入回复内容');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/feedback/${encodeURIComponent(feedbackId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: normalized }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || '回复发送失败');
      setContent('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '回复发送失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-zinc-100 bg-zinc-50/60 p-5">
      <label className="mb-2 block text-xs font-semibold text-zinc-700" htmlFor="support-reply">
        回复用户
      </label>
      <textarea
        className="min-h-32 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-6 text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        disabled={submitting}
        id="support-reply"
        maxLength={5000}
        onChange={(event) => {
          setContent(event.target.value);
          setError('');
        }}
        placeholder="输入处理结果、需要用户补充的信息或下一步建议"
        value={content}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={error ? 'text-xs text-red-600' : 'text-xs text-zinc-400'}>
          {error || `${content.length}/5000 · 回复会写入 App 通知，并尝试发送到用户邮箱`}
        </span>
        <Button isDisabled={submitting || !content.trim()} onPress={() => void submit()} variant="primary">
          <Send aria-hidden="true" size={14} /> {submitting ? '发送中…' : '发送回复'}
        </Button>
      </div>
    </div>
  );
}
