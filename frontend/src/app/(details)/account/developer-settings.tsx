import { Redirect } from 'expo-router';

import { DeveloperSettingsScreen } from '@/features/account/components/developer-settings-screen';
import { developerToolsEnabled } from '@/mocks';

export default function DeveloperSettingsRoute() {
  if (!developerToolsEnabled) return <Redirect href="/(tabs)/account" />;
  return <DeveloperSettingsScreen />;
}
