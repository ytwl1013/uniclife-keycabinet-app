import { NextResponse, type NextRequest } from 'next/server';

import { isSameOriginRequest } from '@/lib/request-security';
import { deleteAdminSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  await deleteAdminSession();
  return NextResponse.json({ message: '已退出' }, { headers: { 'Cache-Control': 'no-store' } });
}
