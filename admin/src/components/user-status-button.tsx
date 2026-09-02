'use client';

import { Button, Spinner } from '@heroui/react';
import { Ban, CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function UserStatusButton({ userId, status, displayName }: { userId: string; status: 'active' | 'disabled'; displayName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus = status === 'active' ? 'disabled' : 'active';

  async function updateStatus() {
    const action = nextStatus === 'disabled' ? '停用' : '启用';
    const warning = nextStatus === 'disabled' ? '\n该用户的全部有效会话会立即撤销。' : '';
    if (!window.confirm(`确认${action}用户“${displayName}”吗？${warning}`)) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = (await response.json()) as { message?: string };
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        setError(body.message ?? '更新失败');
        return;
      }
      router.refresh();
    } catch {
      setError('网络连接异常');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <Button
        isDisabled={pending}
        onPress={updateStatus}
        size="sm"
        variant={nextStatus === 'disabled' ? 'danger-soft' : 'outline'}
      >
        {pending ? (
          <Spinner color="current" size="sm" />
        ) : nextStatus === 'disabled' ? (
          <Ban aria-hidden="true" size={13} />
        ) : (
          <CircleCheck aria-hidden="true" size={13} />
        )}
        {pending ? '处理中' : nextStatus === 'disabled' ? '停用' : '启用'}
      </Button>
      {error && <p className="mt-1 max-w-32 text-[10px] text-red-600" role="alert">{error}</p>}
    </div>
  );
}
