import { entityIdSchema } from '@uniclife/shared';
import { type NextRequest, NextResponse } from 'next/server';

import { getAdminServerEnv } from '@/lib/env';
import { getAdminSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ message: '登录会话已过期' }, { status: 401 });
  }
  const { productId: rawProductId } = await context.params;
  const productId = entityIdSchema.safeParse(rawProductId);
  if (!productId.success) {
    return NextResponse.json({ message: '产品标识不合法' }, { status: 400 });
  }

  let environment;
  try {
    environment = getAdminServerEnv();
  } catch {
    return NextResponse.json({ message: '后台环境变量尚未正确配置' }, { status: 503 });
  }

  try {
    const version = request.nextUrl.searchParams.get('v');
    if (version !== null && !/^[1-9]\d*$/.test(version)) {
      return NextResponse.json({ message: '产品图片版本不合法' }, { status: 400 });
    }
    const query = version ? `?v=${encodeURIComponent(version)}` : '';
    const response = await fetch(
      `${environment.apiBaseUrl}/api/v1/products/${encodeURIComponent(productId.data)}/image${query}`,
      {
        headers: {
          Accept: 'image/webp',
          ...(request.headers.get('if-none-match')
            ? { 'If-None-Match': request.headers.get('if-none-match')! }
            : {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (response.status === 304) return new NextResponse(null, { status: 304 });
    if (!response.ok) {
      return NextResponse.json({ message: '产品图片不存在' }, { status: response.status });
    }
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        'Cache-Control': response.headers.get('cache-control') ?? 'private, max-age=3600',
        'Content-Type': 'image/webp',
        ...(response.headers.get('etag') ? { ETag: response.headers.get('etag')! } : {}),
      },
    });
  } catch {
    return NextResponse.json({ message: '后端服务暂时无法连接' }, { status: 503 });
  }
}
