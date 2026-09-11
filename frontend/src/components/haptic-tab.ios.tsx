import * as Haptics from 'expo-haptics';
import { type BottomTabBarButtonProps } from 'expo-router/js-tabs';

import { TabBarPressable } from '@/components/ui/tab-bar-pressable';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <TabBarPressable
      {...props}
      onPressIn={(event) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(event);
      }}
    />
  );
}
