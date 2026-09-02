import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomSheet as HeroBottomSheet } from 'heroui-native/bottom-sheet';
import { useCallback } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/styles/theme';

import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheet as OverlayBottomSheet } from './bottom-sheet-overlay';
import type { BottomSheetProps } from './bottom-sheet-types';

const NATIVE_SHEET_SNAP_POINTS = ['55%', '82%'];
const LARGE_SHEET_SNAP_POINTS = ['82%'];

export function BottomSheet(props: BottomSheetProps) {
  if (props.size === 'fixed') {
    return <OverlayBottomSheet {...props} />;
  }

  return <DraggableBottomSheet {...props} />;
}

function DraggableBottomSheet({
  children,
  closeLabel,
  footer,
  onClose,
  size = 'default',
  title,
  visible,
}: BottomSheetProps) {
  const { palette } = useAppTheme();
  const snapPoints = size === 'large' ? LARGE_SHEET_SNAP_POINTS : NATIVE_SHEET_SNAP_POINTS;
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <HeroBottomSheet isOpen={visible} onOpenChange={handleOpenChange}>
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
          contentContainerProps={{ style: { flex: 1, padding: 0 } }}
          enableDynamicSizing={false}
          handleIndicatorStyle={{ backgroundColor: palette.line }}
          index={0}
          snapPoints={snapPoints}>
          <BottomSheetContent
            closeLabel={closeLabel}
            fillAvailable
            footer={footer}
            onClose={onClose}
            renderBody={(content) => (
              <BottomSheetScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}>
                <View className="gap-5 px-screen py-5">{content}</View>
              </BottomSheetScrollView>
            )}
            title={title}>
            {children}
          </BottomSheetContent>
        </HeroBottomSheet.Content>
      </HeroBottomSheet.Portal>
    </HeroBottomSheet>
  );
}
