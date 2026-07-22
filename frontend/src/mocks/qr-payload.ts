const CABINET_QR_PREFIX = 'uniclife://cabinet/';
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;

export type ParsedCabinetQrPayload = {
  canonical: string;
  token: string;
};

export function createCabinetQrPayload(token: string): string {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Cabinet QR tokens must be 16-64 URL-safe characters.');
  }
  return `${CABINET_QR_PREFIX}${token}`;
}

export function parseCabinetQrPayload(raw: string): ParsedCabinetQrPayload | null {
  const value = raw.trim();
  if (!value.toLowerCase().startsWith(CABINET_QR_PREFIX)) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'uniclife:' || parsed.hostname !== 'cabinet' || parsed.search || parsed.hash) {
      return null;
    }
    const token = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!TOKEN_PATTERN.test(token)) return null;
    return { canonical: createCabinetQrPayload(token), token };
  } catch {
    return null;
  }
}

export { CABINET_QR_PREFIX };
