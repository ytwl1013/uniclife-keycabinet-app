import { adminProductSchema, entityIdSchema } from '@uniclife/shared';
import type { Metadata } from 'next';

import { ErrorState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/product-form';
import { safeAdminApi } from '@/lib/admin-api';
import { getAdminEnvironmentName } from '@/lib/env';

export const metadata: Metadata = { title: '编辑产品' };

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const raw = await params;
  const productId = entityIdSchema.safeParse(raw.productId);
  const environment = getAdminEnvironmentName();
  if (!productId.success) {
    return (
      <>
        <PageHeader description="管理产品展示资料和批量生产二维码。" environment={environment} title="编辑产品" />
        <ErrorState message="产品标识不合法" />
      </>
    );
  }

  const result = await safeAdminApi(
    `/products/${encodeURIComponent(productId.data)}`,
    adminProductSchema,
  );
  if (!result.data) {
    return (
      <>
        <PageHeader description="管理产品展示资料和批量生产二维码。" environment={environment} title="编辑产品" />
        <ErrorState message={result.error ?? '产品资料加载失败'} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        description={`${result.data.sku} 的二维码保持不变；图片、描述及其他展示资料可继续维护。`}
        environment={environment}
        title={result.data.name}
      />
      <ProductForm mode="edit" product={result.data} />
    </>
  );
}
