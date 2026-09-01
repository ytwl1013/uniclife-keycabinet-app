import { Spinner } from '@heroui/react';

export default function Loading() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="text-center">
        <Spinner color="accent" size="lg" />
        <p className="mt-3 text-xs text-zinc-400">正在加载管理数据…</p>
      </div>
    </div>
  );
}
