import {
  adminProductSchema,
  adminProductUpdateRequestSchema,
  entityIdSchema,
} from '@uniclife/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { AdminApiError, requestAdminApi } from '@/lib/admin-api';
import { isSameOriginRequest } from '@/lib/request-security';
import { getAdminSession } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ message: '登录会话已过期' }, { status: 401 });
  }

  const { productId: rawProductId } = await context.params;
  const productId = entityIdSchema.safeParse(rawProductId);
  const input = adminProductUpdateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!productId.success || !input.success) {
    return NextResponse.json({ message: '产品标识或资料不合法' }, { status: 400 });
  }

  try {
    const data = await requestAdminApi(
      `/products/${encodeURIComponent(productId.data)}`,
      adminProductSchema,
      { method: 'PATCH', body: input.data },
    );
    return NextResponse.json({ message: '产品资料已保存，二维码保持不变', data });
  } catch (error) {
    const adminError = error instanceof AdminApiError ? error : null;
    return NextResponse.json(
      { message: adminError?.message ?? '产品资料保存失败' },
      { status: adminError?.status ?? 500 },
    );
  }
}
