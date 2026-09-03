import type { Cabinet, ProductSku } from '@/app-state';

export type CabinetManual = {
  cabinet: Cabinet;
  sku: ProductSku;
  url: string;
};

export function selectCabinetManuals(
  cabinets: readonly Cabinet[],
  skuById: (skuId: string) => ProductSku | undefined,
): CabinetManual[] {
  return cabinets.flatMap((cabinet) => {
    const sku = skuById(cabinet.skuId);
    const url = sku?.manualUrl?.trim();
    return sku && url ? [{ cabinet, sku, url }] : [];
  });
}
