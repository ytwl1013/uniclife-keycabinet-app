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
      ['UC-2400', 'cabinet-24-white'],
      ['UC-4800', 'cabinet-48-navy'],
      ['UC-1200', 'cabinet-12-blue'],
    ]);
    expect(new Set(skus.map((sku) => sku.imageAsset)).size).toBe(3);
    expect(Object.keys(productImageAssets)).toHaveLength(3);
    for (const sku of skus) expect(isProductImageAssetKey(sku.imageAsset)).toBe(true);
  });

  it('uses contain and an explicit numeric container size', async () => {
    const { getByTestId } = await render(
      <ProductImage
        accessibilityLabel="UC-2400 Arctic White key cabinet"
        assetKey="cabinet-24-white"
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
