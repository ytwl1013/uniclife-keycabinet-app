import {
  adminUserStatusRequestSchema,
  adminUserStatusResultSchema,
} from '@uniclife/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { AdminApiError, requestAdminApi } from '@/lib/admin-api';
import { isSameOriginRequest } from '@/lib/request-security';
import { getAdminSession } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ message: '登录会话已过期' }, { status: 401 });
  }
  let input;
  try {
    input = adminUserStatusRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: '用户状态参数不合法' }, { status: 400 });
  }
  const { userId } = await context.params;
  if (!userId || userId.length > 128) {
    return NextResponse.json({ message: '用户标识不合法' }, { status: 400 });
  }

  try {
    const data = await requestAdminApi(
      `/users/${encodeURIComponent(userId)}/status`,
      adminUserStatusResultSchema,
      { method: 'PATCH', body: input },
    );
    return NextResponse.json({ message: '用户状态已更新', data });
  } catch (error) {
    const adminError = error instanceof AdminApiError ? error : null;
    return NextResponse.json(
      { message: adminError?.message ?? '用户状态更新失败' },
      { status: adminError?.status ?? 500 },
    );
  }
}
