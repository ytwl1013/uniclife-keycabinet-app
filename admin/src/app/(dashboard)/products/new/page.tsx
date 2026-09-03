import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/product-form';
import { getAdminEnvironmentName } from '@/lib/env';

export const metadata: Metadata = { title: '新建产品' };

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        description="SKU 与二维码创建后不可修改；请先确认 SKU 再保存。"
        environment={getAdminEnvironmentName()}
        title="新建产品"
      />
      <ProductForm mode="create" />
    </>
  );
}
