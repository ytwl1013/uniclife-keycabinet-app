import type { ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

import type { BottomSheetProps } from './bottom-sheet-types';

type BottomSheetContentProps = Omit<BottomSheetProps, 'size' | 'visible'> & {
  fillAvailable?: boolean;
  renderBody?: (children: ReactNode) => ReactNode;
  roundedTop?: boolean;
};

export function BottomSheetContent({
  children,
  closeLabel,
  fillAvailable = false,
  footer,
  onClose,
  renderBody,
  roundedTop = false,
  title,
}: BottomSheetContentProps) {
  const { height } = useWindowDimensions();
  const { palette } = useAppTheme();
  const containerClassName = [
    fillAvailable ? 'flex-1' : '',
    'overflow-hidden bg-surface',
    roundedTop ? 'rounded-t-[28px] border border-line' : '',
  ].filter(Boolean).join(' ');

  return (
    <SafeAreaView
      accessibilityViewIsModal
      className={containerClassName}
      edges={['bottom']}
      style={{
        backgroundColor: palette.surface,
        ...(fillAvailable ? { flex: 1 } : { maxHeight: height * 0.82 }),
      }}>
      {roundedTop ? (
        <View
          accessibilityElementsHidden
          className="items-center pb-1 pt-2"
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none">
          <View className="h-1 w-10 rounded-pill bg-line" />
        </View>
      ) : null}
      <View className="flex-row items-center gap-3 border-b border-line px-screen py-4">
        <AppText className="flex-1" variant="title" tone="foreground">
          {title}
        </AppText>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-pill bg-background active:opacity-70"
          onPress={onClose}>
          <AppIcon name="chevronDown" size={23} tone="foreground" />
        </Pressable>
      </View>
      {renderBody ? (
        renderBody(children)
      ) : (
        <ScrollView
          className={fillAvailable ? 'min-h-0 flex-1' : 'shrink'}
          contentContainerClassName="gap-5 px-screen py-5"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      )}
      {footer ? <View className="border-t border-line px-screen py-3">{footer}</View> : null}
    </SafeAreaView>
  );
}
