import { Redirect } from 'expo-router';

import { developerToolsEnabled } from '@/config/developer';
import { DeveloperSettingsScreen } from '@/features/account/components/developer-settings-screen';

export default function DeveloperSettingsRoute() {
  if (!developerToolsEnabled) return <Redirect href="/(tabs)/account" />;
  return <DeveloperSettingsScreen />;
}
