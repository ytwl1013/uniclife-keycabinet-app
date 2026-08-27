export const developerToolsEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS === 'true';

export const localPasswordResetEnabled = __DEV__;

export function allowSampleQrPreview(requested: boolean): boolean {
  return requested && process.env.EXPO_PUBLIC_ENABLE_SAMPLE_QR_PREVIEW === 'true';
}
