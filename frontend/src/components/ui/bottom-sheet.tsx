import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

const SHEET_ENTER_DURATION = 220;
const SHEET_EXIT_DURATION = 180;

export function BottomSheet({ children, closeLabel, footer, onClose, title, visible }: BottomSheetProps) {
  const { palette, variables } = useAppTheme();
  const [mounted, setMounted] = useState(visible);
  const [contentVisible, setContentVisible] = useState(visible);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (visible) {
      setMounted(true);
      setContentVisible(true);
      return;
    }

    setContentVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, SHEET_EXIT_DURATION);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible>
      <View className="flex-1 justify-end" style={variables}>
        {contentVisible ? (
          <>
            <Animated.View
              className="absolute inset-0"
              entering={FadeIn.duration(SHEET_ENTER_DURATION)}
              exiting={FadeOut.duration(SHEET_EXIT_DURATION)}
              pointerEvents="none"
              style={{ backgroundColor: 'rgba(11, 25, 49, 0.45)' }}
            />
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              className="absolute inset-0"
              onPress={onClose}
            />
            <Animated.View
              className="w-full"
              entering={SlideInDown.duration(SHEET_ENTER_DURATION).easing(Easing.out(Easing.cubic))}
              exiting={SlideOutDown.duration(SHEET_EXIT_DURATION).easing(Easing.in(Easing.cubic))}>
              <SafeAreaView
                accessibilityViewIsModal
                className="max-h-[82%] overflow-hidden rounded-t-[28px] border border-line bg-surface"
                edges={['bottom']}
                style={{ backgroundColor: palette.surface, maxHeight: '82%' }}>
                <View className="flex-row items-center gap-3 border-b border-line px-screen py-4">
                  <AppText className="flex-1" variant="title" tone="foreground">{title}</AppText>
                  <Pressable
                    accessibilityLabel={closeLabel}
                    accessibilityRole="button"
                    className="h-11 w-11 items-center justify-center rounded-pill bg-background active:opacity-70"
                    onPress={onClose}>
                    <AppIcon name="chevronDown" size={23} tone="foreground" />
                  </Pressable>
                </View>
                <ScrollView contentContainerClassName="gap-5 px-screen py-5" showsVerticalScrollIndicator={false}>
                  {children}
                </ScrollView>
                {footer ? <View className="border-t border-line px-screen py-3">{footer}</View> : null}
              </SafeAreaView>
            </Animated.View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
