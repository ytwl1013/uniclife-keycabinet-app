export type ParsedProductQr = {
  sku: string;
  canonical: string;
};

export type ParsedJoinQr = {
  token: string;
  canonical: string;
};

const PRODUCT_QR_PATTERN =
  /^uniclife:\/\/cabinet\/v1\/init\/([A-Za-z0-9-]{1,64})\/([A-Za-z0-9_-]{16,128})$/;
const JOIN_QR_PATTERN =
  /^uniclife:\/\/cabinet\/v1\/join\/([A-Za-z0-9_-]{32,128})$/;

export function parseProductQrPayload(value: string): ParsedProductQr | null {
  const match = PRODUCT_QR_PATTERN.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const sku = match[1].toUpperCase();
  return {
    sku,
    canonical: `uniclife://cabinet/v1/init/${sku}/${match[2]}`,
  };
}

export function parseJoinQrPayload(value: string): ParsedJoinQr | null {
  const match = JOIN_QR_PATTERN.exec(value.trim());
  if (!match?.[1]) return null;
  return {
    token: match[1],
    canonical: `uniclife://cabinet/v1/join/${match[1]}`,
  };
}
