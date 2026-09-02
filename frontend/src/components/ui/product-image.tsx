import { Image, ImageSource } from 'expo-image';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';

export const productImageAssets = {
  'cabinet-bg5163-bk': require('@/assets/images/bg5163-bk.jpg'),
  'cabinet-bg0680-bk': require('@/assets/images/bg0680-bk.jpg'),
} as const satisfies Record<string, ImageSource>;

export type ProductImageAssetKey = keyof typeof productImageAssets;
export type ProductImageVariant = 'hero' | 'detail' | 'card' | 'thumbnail' | 'scan';

export type ProductImageProps = {
  assetKey?: string;
  variant: ProductImageVariant;
  accessibilityLabel: string;
};

const sizes: Record<ProductImageVariant, { width: number; height: number }> = {
  hero: { width: 320, height: 232 },
  detail: { width: 208, height: 176 },
  card: { width: 104, height: 104 },
  thumbnail: { width: 82, height: 82 },
  scan: { width: 144, height: 132 },
};

export function isProductImageAssetKey(value?: string): value is ProductImageAssetKey {
  return Boolean(value && value in productImageAssets);
}

export function ProductImage({ accessibilityLabel, assetKey, variant }: ProductImageProps) {
  const size = sizes[variant];

  if (!isProductImageAssetKey(assetKey)) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        className="items-center justify-center"
        style={size}>
        <AppIcon name="cabinet" size={variant === 'thumbnail' ? 30 : 42} tone="brand" />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      contentFit="contain"
      source={productImageAssets[assetKey]}
      style={size}
      testID="product-image"
      transition={120}
    />
  );
}
