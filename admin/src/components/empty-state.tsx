import { Card } from '@heroui/react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="admin-card border-amber-200 bg-amber-50/70">
      <Card.Content className="flex items-center gap-4 p-5 max-sm:items-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <TriangleAlert aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">数据暂时不可用</p>
          <p className="mt-1 text-xs leading-5 text-amber-800/75">{message}。请确认后台环境变量与后端服务状态。</p>
        </div>
        <Link className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800 hover:bg-amber-100" href="/">
          <RefreshCw aria-hidden="true" size={14} />
          重试
        </Link>
      </Card.Content>
    </Card>
  );
}

export function TableEmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
      <div>
        <span className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-400">
          <RefreshCw aria-hidden="true" size={17} />
        </span>
        <p className="text-sm font-medium text-zinc-700">暂无数据</p>
        <p className="mt-1 text-xs text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
