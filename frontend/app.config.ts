import type { ConfigContext, ExpoConfig } from 'expo/config';

const productionAndroidPackage = 'com.youliusteam.keycabinetapp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    ...config.android,
    package: process.env.EXPO_LOCAL_ANDROID === '1'
      ? `${productionAndroidPackage}.debug`
      : config.android?.package ?? productionAndroidPackage,
  },
});
