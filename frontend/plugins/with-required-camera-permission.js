const { withAndroidManifest } = require('expo/config-plugins');

const CAMERA_PERMISSION = 'android.permission.CAMERA';

module.exports = function withRequiredCameraPermission(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];

    manifest['uses-permission'] = permissions.filter(
      (permission) => permission.$?.['android:name'] !== CAMERA_PERMISSION,
    );
    manifest['uses-permission'].push({
      $: { 'android:name': CAMERA_PERMISSION },
    });

    return nextConfig;
  });
};
