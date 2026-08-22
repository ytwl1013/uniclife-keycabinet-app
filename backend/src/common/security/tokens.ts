import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

const ephemeralDevelopmentPepper = randomBytes(32).toString('base64url');

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function digestToken(token: string): string {
  const pepper = env.AUTH_TOKEN_PEPPER ?? ephemeralDevelopmentPepper;
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
