import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function pageHref(
  basePath: string,
  current: URLSearchParams,
  offset: number,
): string {
  const next = new URLSearchParams(current);
  next.set('offset', String(Math.max(0, offset)));
  return `${basePath}?${next.toString()}`;
}

export function Pagination({
  basePath,
  searchParams,
  offset,
  limit,
  total,
}: {
  basePath: string;
  searchParams: URLSearchParams;
  offset: number;
  limit: number;
  total: number;
}) {
  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3.5">
      <p className="text-xs text-zinc-400">
        共 <span className="font-medium text-zinc-700">{total}</span> 条 · 第 {currentPage}/{pageCount} 页
      </p>
      <div className="flex gap-2">
        <Link
          aria-disabled={offset <= 0}
          className={`inline-flex min-h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 ${offset <= 0 ? 'pointer-events-none opacity-45' : ''}`}
          href={pageHref(basePath, searchParams, offset - limit)}
        >
          <ChevronLeft aria-hidden="true" size={14} />
          上一页
        </Link>
        <Link
          aria-disabled={offset + limit >= total}
          className={`inline-flex min-h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 ${offset + limit >= total ? 'pointer-events-none opacity-45' : ''}`}
          href={pageHref(basePath, searchParams, offset + limit)}
        >
          下一页
          <ChevronRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </div>
  );
}
