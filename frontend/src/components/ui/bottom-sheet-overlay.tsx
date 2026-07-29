import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet-types';

const SHEET_ENTER_DURATION = 220;
const SHEET_EXIT_DURATION = 180;

export function BottomSheet({
  children,
  closeLabel,
  footer,
  onClose,
  title,
  visible,
}: BottomSheetProps) {
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
      return undefined;
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
      <View className="flex-1 justify-end">
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
              entering={SlideInDown.duration(SHEET_ENTER_DURATION).easing(
                Easing.out(Easing.cubic),
              )}
              exiting={SlideOutDown.duration(SHEET_EXIT_DURATION).easing(
                Easing.in(Easing.cubic),
              )}>
              <BottomSheetContent
                closeLabel={closeLabel}
                footer={footer}
                onClose={onClose}
                roundedTop
                title={title}>
                {children}
              </BottomSheetContent>
            </Animated.View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
