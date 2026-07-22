export const developerToolsEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS === 'true';

export const localPasswordResetEnabled = developerToolsEnabled;

export function allowSampleQrPreview(
  requested: boolean,
  enabled = developerToolsEnabled,
) {
  return requested && enabled;
}
