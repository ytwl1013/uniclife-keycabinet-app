import { entityIdSchema } from '@uniclife/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { AdminApiError, requestAdminApi } from '@/lib/admin-api';
import { isSameOriginRequest } from '@/lib/request-security';
import { getAdminSession } from '@/lib/session';

const responseSchema = z.object({ markedReadCount: z.number().int().nonnegative() });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ feedbackId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ message: '登录会话已过期' }, { status: 401 });
  }
  const { feedbackId: rawFeedbackId } = await context.params;
  const feedbackId = entityIdSchema.safeParse(rawFeedbackId);
  if (!feedbackId.success) {
    return NextResponse.json({ message: '反馈编号不合法' }, { status: 400 });
  }

  try {
    const data = await requestAdminApi(
      `/feedback/${encodeURIComponent(feedbackId.data)}/read`,
      responseSchema,
      { method: 'POST' },
    );
    return NextResponse.json({ message: '会话已读', data });
  } catch (error) {
    const adminError = error instanceof AdminApiError ? error : null;
    return NextResponse.json(
      { message: adminError?.message ?? '会话已读状态更新失败' },
      { status: adminError?.status ?? 500 },
    );
  }
}
