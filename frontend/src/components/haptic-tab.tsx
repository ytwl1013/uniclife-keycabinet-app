import { type BottomTabBarButtonProps } from 'expo-router/js-tabs';

import { TabBarPressable } from '@/components/ui/tab-bar-pressable';

export function HapticTab(props: BottomTabBarButtonProps) {
  return <TabBarPressable {...props} />;
}
