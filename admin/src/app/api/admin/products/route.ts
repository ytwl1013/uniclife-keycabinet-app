import {
  adminProductCreateRequestSchema,
  adminProductSchema,
} from '@uniclife/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { AdminApiError, requestAdminApi } from '@/lib/admin-api';
import { isSameOriginRequest } from '@/lib/request-security';
import { getAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ message: '登录会话已过期' }, { status: 401 });
  }

  const parsed = adminProductCreateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: '产品资料或预处理图片不合法' }, { status: 400 });
  }

  try {
    const data = await requestAdminApi('/products', adminProductSchema, {
      method: 'POST',
      body: parsed.data,
    });
    return NextResponse.json({ message: '产品已创建，永久二维码已生成', data }, { status: 201 });
  } catch (error) {
    const adminError = error instanceof AdminApiError ? error : null;
    return NextResponse.json(
      { message: adminError?.message ?? '产品创建失败' },
      { status: adminError?.status ?? 500 },
    );
  }
}
