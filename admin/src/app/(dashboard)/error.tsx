'use client';

import { Button } from '@heroui/react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
          <TriangleAlert aria-hidden="true" size={24} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900">页面加载失败</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">没有执行任何管理操作。可以安全重试，或检查后端服务连接。</p>
        <Button className="mt-5" onPress={reset} variant="primary">
          <RefreshCw aria-hidden="true" size={15} />
          重新加载
        </Button>
      </div>
    </div>
  );
}
