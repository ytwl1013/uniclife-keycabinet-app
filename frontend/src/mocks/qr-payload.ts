const CABINET_QR_PREFIX = 'uniclife://cabinet/v1/init/';
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const PRODUCT_CODE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type ParsedCabinetQrPayload = {
  canonical: string;
  sku: string;
  productCode: string;
};

export function createCabinetQrPayload(sku: string, productCode: string): string {
  const normalizedSku = sku.trim().toUpperCase();
  const normalizedProductCode = productCode.trim();
  if (!SKU_PATTERN.test(normalizedSku)) {
    throw new Error('Cabinet QR SKUs must contain only letters, numbers, and hyphens.');
  }
  if (!PRODUCT_CODE_PATTERN.test(normalizedProductCode)) {
    throw new Error('Product QR codes must use 16–128 URL-safe characters.');
  }
  return `${CABINET_QR_PREFIX}${normalizedSku}/${normalizedProductCode}`;
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
    if (segments.length !== 4 || segments[0] !== 'v1' || segments[1] !== 'init') return null;
    const [, , sku, productCode] = segments;
    const canonical = createCabinetQrPayload(sku, productCode);
    return { canonical, sku: sku.toUpperCase(), productCode };
  } catch {
    return null;
  }
}

export { CABINET_QR_PREFIX };
