import { Image, ImageSource } from 'expo-image';
import { View } from 'react-native';

import { apiConfig } from '@/api/config';
import { AppIcon } from '@/components/ui/app-icon';

export const productImageAssets = {
  'cabinet-bg5163-bk': require('@/assets/images/bg5163-bk.jpg'),
  'cabinet-bg0680-bk': require('@/assets/images/bg0680-bk.jpg'),
} as const satisfies Record<string, ImageSource>;

export type ProductImageAssetKey = keyof typeof productImageAssets;
export type ProductImageVariant = 'hero' | 'detail' | 'card' | 'thumbnail' | 'scan';

export type ProductImageProps = {
  assetKey?: string;
  imagePath?: string;
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

function remoteImageUrl(imagePath?: string): string | undefined {
  if (!imagePath?.startsWith('/api/v1/products/')) return undefined;
  return new URL(imagePath, new URL(apiConfig.baseUrl).origin).toString();
}

export function ProductImage({ accessibilityLabel, assetKey, imagePath, variant }: ProductImageProps) {
  const size = sizes[variant];
  const remoteUrl = remoteImageUrl(imagePath);
  const bundledAsset = isProductImageAssetKey(assetKey) ? productImageAssets[assetKey] : undefined;

  if (!remoteUrl && !bundledAsset) {
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
      cachePolicy="disk"
      contentFit="contain"
      source={remoteUrl ? { uri: remoteUrl } : bundledAsset}
      style={size}
      testID="product-image"
      transition={120}
    />
  );
}
