const CABINET_QR_PREFIX = 'uniclife://cabinet/';
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedCabinetQrPayload = {
  canonical: string;
  sku: string;
  uuid: string;
};

export function createCabinetQrPayload(sku: string, uuid: string): string {
  const normalizedSku = sku.trim().toUpperCase();
  const normalizedUuid = uuid.trim().toLowerCase();
  if (!SKU_PATTERN.test(normalizedSku)) {
    throw new Error('Cabinet QR SKUs must contain only letters, numbers, and hyphens.');
  }
  if (!UUID_PATTERN.test(normalizedUuid)) {
    throw new Error('Cabinet QR UUIDs must use canonical UUID format.');
  }
  return `${CABINET_QR_PREFIX}${normalizedSku}/${normalizedUuid}`;
}

export function parseCabinetQrPayload(raw: string): ParsedCabinetQrPayload | null {
  const value = raw.trim();
  if (!value.toLowerCase().startsWith(CABINET_QR_PREFIX)) return null;

  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'uniclife:' ||
      parsed.hostname !== 'cabinet' ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return null;
    }
    const segments = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments.length !== 2) return null;
    const [sku, uuid] = segments;
    const canonical = createCabinetQrPayload(sku, uuid);
    return { canonical, sku: sku.toUpperCase(), uuid: uuid.toLowerCase() };
  } catch {
    return null;
  }
}

export { CABINET_QR_PREFIX };
