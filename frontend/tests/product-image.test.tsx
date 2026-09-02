import { render } from '@testing-library/react-native';

import {
  isProductImageAssetKey,
  ProductImage,
  productImageAssets,
} from '../src/components/ui/product-image';
import { getSeedData } from '../src/mocks/seed';

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return React.createElement(View, { ...props, testID: 'product-image' });
  },
}));

describe('SKU product images', () => {
  it('maps every SKU to one unique, supported product asset', () => {
    const skus = getSeedData().skus;
    expect(skus.map((sku) => [sku.model, sku.imageAsset])).toEqual([
      ['BG5163-BK', 'cabinet-bg5163-bk'],
      ['BG0680-BK', 'cabinet-bg0680-bk'],
    ]);
    expect(skus.map((sku) => sku.capacity)).toEqual([32, 60]);
    expect(new Set(skus.map((sku) => sku.imageAsset)).size).toBe(2);
    expect(Object.keys(productImageAssets)).toHaveLength(2);
    for (const sku of skus) expect(isProductImageAssetKey(sku.imageAsset)).toBe(true);
  });

  it('uses contain and an explicit numeric container size', async () => {
    const { getByTestId } = await render(
      <ProductImage
        accessibilityLabel="Uniclife 32 Position Key Cabinet"
        assetKey="cabinet-bg5163-bk"
        variant="card"
      />,
    );
    const image = getByTestId('product-image');
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.style).toEqual({ width: 104, height: 104 });
  });

  it('shows an accessible cabinet fallback only for an unknown asset', async () => {
    const { getByLabelText, queryByTestId } = await render(
      <ProductImage accessibilityLabel="Unknown key cabinet" assetKey="missing" variant="thumbnail" />,
    );
    expect(getByLabelText('Unknown key cabinet').props.accessibilityRole).toBe('image');
    expect(queryByTestId('product-image')).toBeNull();
  });
});
