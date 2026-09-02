import { compare } from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getAdminServerEnv } from '@/lib/env';
import { clearLoginAttempts, consumeLoginAttempt } from '@/lib/rate-limit';
import { clientAddress, isSameOriginRequest } from '@/lib/request-security';
import { createAdminSession } from '@/lib/session';

const loginSchema = z.object({
  username: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: '请求来源不受信任' }, { status: 403 });
  }
  const address = clientAddress(request);
  const rateLimit = consumeLoginAttempt(address);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: '登录尝试过多，请稍后再试' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let input;
  try {
    input = loginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: '请输入有效的管理员账号和密码' }, { status: 400 });
  }

  let environment;
  try {
    environment = getAdminServerEnv();
  } catch {
    return NextResponse.json({ message: '管理后台尚未完成安全配置' }, { status: 503 });
  }
  const passwordValid = await compare(input.password, environment.ADMIN_PASSWORD_HASH);
  if (input.username !== environment.ADMIN_USERNAME || !passwordValid) {
    return NextResponse.json({ message: '账号或密码错误' }, { status: 401 });
  }

  clearLoginAttempts(address);
  await createAdminSession();
  return NextResponse.json(
    { message: '登录成功' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
