import 'server-only';

import { cookies } from 'next/headers';

import { getAdminServerEnv } from './env';
import { createSignedSession, verifySignedSession } from './session-codec';

function cookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Host-uniclife-admin-session'
    : 'uniclife-admin-session';
}

export async function createAdminSession(): Promise<void> {
  const environment = getAdminServerEnv();
  const maxAge = environment.ADMIN_SESSION_TTL_HOURS * 60 * 60;
  const token = createSignedSession(
    environment.ADMIN_USERNAME,
    environment.ADMIN_SESSION_SECRET,
    maxAge * 1000,
  );
  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  let environment;
  try {
    environment = getAdminServerEnv();
  } catch {
    return null;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;
  if (!token) return null;
  const payload = verifySignedSession(token, environment.ADMIN_SESSION_SECRET);
  if (!payload || payload.username !== environment.ADMIN_USERNAME) return null;
  return { username: payload.username };
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName());
}
