import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomSheet as HeroBottomSheet } from 'heroui-native/bottom-sheet';
import { HeroUINativeProvider } from 'heroui-native/provider';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/styles/theme';

import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet-types';

const heroUiConfig = {
  toast: false,
} as const;

export function BottomSheet({
  children,
  closeLabel,
  footer,
  onClose,
  title,
  visible,
}: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const { palette } = useAppTheme();
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && visible) {
        onClose();
      }
    },
    [onClose, visible],
  );

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <HeroUINativeProvider config={heroUiConfig}>
        <HeroBottomSheet isOpen onOpenChange={handleOpenChange}>
          <HeroBottomSheet.Portal unstable_accessibilityContainerViewIsModal>
            <HeroBottomSheet.Overlay
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              style={{ backgroundColor: 'rgba(11, 25, 49, 0.45)' }}
            />
            <HeroBottomSheet.Content
              backgroundStyle={{
                backgroundColor: palette.surface,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
              contentContainerProps={{ style: { padding: 0 } }}
              enableDynamicSizing
              handleIndicatorStyle={{ backgroundColor: palette.line }}
              maxDynamicContentSize={height * 0.82}>
              <BottomSheetContent
                closeLabel={closeLabel}
                footer={footer}
                onClose={onClose}
                renderBody={(content) => (
                  <BottomSheetScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View className="gap-5 px-screen py-5">{content}</View>
                  </BottomSheetScrollView>
                )}
                title={title}>
                {children}
              </BottomSheetContent>
            </HeroBottomSheet.Content>
          </HeroBottomSheet.Portal>
        </HeroBottomSheet>
      </HeroUINativeProvider>
    </View>
  );
}
