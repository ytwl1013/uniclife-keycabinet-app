import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

const ephemeralTestPepper = randomBytes(32).toString('base64url');

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function digestToken(token: string): string {
  // Non-test runtimes reject a missing pepper while loading env. Tests keep an
  // isolated process-local value so fixtures never need a committed secret.
  const pepper = env.AUTH_TOKEN_PEPPER ?? ephemeralTestPepper;
  return createHmac('sha256', pepper).update(token).digest('hex');
}

export function createNumericCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, '0');
}

export function secureDigestEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
