import type { Cabinet, ProductSku } from '@/app-state';
import { selectCabinetManuals } from '@/features/manuals/select-cabinet-manuals';

const cabinet = (id: string, skuId: string) => ({
  id,
  name: `Cabinet ${id}`,
  skuId,
} as Cabinet);

const sku = (id: string, manualUrl?: string) => ({
  id,
  manualUrl,
  model: `Model ${id}`,
  name: `Product ${id}`,
  sku: id.toUpperCase(),
} as ProductSku);

describe('cabinet manuals', () => {
  it('lists one manual for each visible cabinet whose SKU has a link', () => {
    const products = new Map([
      ['sku-with-manual', sku('sku-with-manual', 'https://example.com/manual')],
      ['sku-without-manual', sku('sku-without-manual')],
      ['sku-empty-manual', sku('sku-empty-manual', '   ')],
    ]);

    const manuals = selectCabinetManuals(
      [
        cabinet('one', 'sku-with-manual'),
        cabinet('two', 'sku-with-manual'),
        cabinet('three', 'sku-without-manual'),
        cabinet('four', 'sku-empty-manual'),
      ],
      (skuId) => products.get(skuId),
    );

    expect(manuals.map(({ cabinet: item, url }) => [item.id, url])).toEqual([
      ['one', 'https://example.com/manual'],
      ['two', 'https://example.com/manual'],
    ]);
  });

  it('returns an empty list when no visible cabinet has a manual', () => {
    expect(selectCabinetManuals(
      [cabinet('one', 'missing-sku')],
      () => undefined,
    )).toEqual([]);
  });
});
