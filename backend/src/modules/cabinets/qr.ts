export type ParsedCabinetQr = {
  sku: string;
  deviceUuid: string;
  canonical: string;
};

const QR_PATTERN =
  /^uniclife:\/\/cabinet\/([A-Za-z0-9-]{1,64})\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/;

export function parseCabinetQrPayload(value: string): ParsedCabinetQr | null {
  const match = QR_PATTERN.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const sku = match[1].toUpperCase();
  const deviceUuid = match[2].toLowerCase();
  return {
    sku,
    deviceUuid,
    canonical: `uniclife://cabinet/${sku}/${deviceUuid}`,
  };
}
