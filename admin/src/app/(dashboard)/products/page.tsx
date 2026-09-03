import { adminProductListSchema, adminProductQuerySchema } from '@uniclife/shared';
import { Button, Card, Input } from '@heroui/react';
import { ImageIcon, Pencil, Plus, QrCode, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ErrorState, TableEmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: '产品与二维码' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const query = adminProductQuerySchema.parse({
    query: first(raw.query),
    limit: 20,
    offset: first(raw.offset),
  });
  const apiSearch = new URLSearchParams({
    query: query.query,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  const result = await safeAdminApi(`/products?${apiSearch.toString()}`, adminProductListSchema);
  const environment = getAdminEnvironmentName();
  const currentSearch = new URLSearchParams();
  if (query.query) currentSearch.set('query', query.query);

  return (
    <>
      <PageHeader
        actions={(
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800" href="/products/new">
            <Plus aria-hidden="true" size={15} /> 新建产品
          </Link>
        )}
        description="在浏览器端预处理图片，创建不可变 SKU 和永久二维码，并维护展示资料。"
        environment={environment}
        title="产品与二维码"
      />

      {!result.data ? <ErrorState message={result.error ?? '管理数据加载失败'} /> : (
        <Card className="admin-card overflow-hidden">
          <Card.Header className="border-b border-zinc-100 px-5 py-4">
            <form className="flex w-full items-center gap-3 max-sm:flex-col" method="get">
              <div className="relative min-w-0 flex-1 max-sm:w-full">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={15} />
                <Input
                  aria-label="搜索产品"
                  className="h-10 w-full pl-9"
                  defaultValue={query.query}
                  maxLength={128}
                  name="query"
                  placeholder="搜索 SKU、型号、名称或描述"
                />
              </div>
              <Button className="h-10 max-sm:w-full" type="submit" variant="primary">
                <Search aria-hidden="true" size={14} /> 查询
              </Button>
            </form>
          </Card.Header>

          {result.data.items.length ? (
            <>
              <div className="soft-scrollbar overflow-x-auto">
                <table className="data-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th>产品</th>
                      <th>SKU / 型号</th>
                      <th>容量</th>
                      <th>二维码</th>
                      <th>柜体</th>
                      <th>最后更新</th>
                      <th className="text-right">管理</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                              {product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt=""
                                  className="size-full object-contain"
                                  src={`/api/admin/products/${encodeURIComponent(product.id)}/image?v=${product.image.version}`}
                                />
                              ) : <ImageIcon aria-hidden="true" className="text-zinc-300" size={18} />}
                            </span>
                            <span>
                              <span className="block font-medium text-zinc-800">{product.name}</span>
                              <span className="mt-0.5 block text-[10px] text-zinc-400">{product.color}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="block font-mono text-xs font-semibold text-zinc-700">{product.sku}</span>
                          <span className="mt-0.5 block text-[10px] text-zinc-400">{product.model}</span>
                        </td>
                        <td>{product.capacity} 槽</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 text-xs ${product.qr ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <QrCode aria-hidden="true" size={14} /> {product.qr ? '已生成' : '未生成'}
                          </span>
                        </td>
                        <td>{product.cabinetCount}</td>
                        <td>{formatDateTime(product.updatedAt)}</td>
                        <td className="text-right">
                          <Link
                            aria-label={`编辑 ${product.sku}`}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                            href={`/products/${encodeURIComponent(product.id)}`}
                          >
                            <Pencil aria-hidden="true" size={13} /> 编辑与下载
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                basePath="/products"
                limit={result.data.limit}
                offset={result.data.offset}
                searchParams={currentSearch}
                total={result.data.total}
              />
            </>
          ) : <TableEmptyState message="还没有产品 SKU，可以先创建第一个。" />}
        </Card>
      )}
    </>
  );
}
