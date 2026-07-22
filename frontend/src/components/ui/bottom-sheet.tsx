import { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
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

export function BottomSheet({ children, closeLabel, footer, onClose, title, visible }: BottomSheetProps) {
  const { palette, variables } = useAppTheme();
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View
        className="flex-1 justify-end"
        style={[variables, { backgroundColor: 'rgba(11, 25, 49, 0.45)' }]}>
        <Pressable accessibilityLabel={closeLabel} className="absolute inset-0" onPress={onClose} />
        <SafeAreaView
          accessibilityViewIsModal
          className="max-h-[82%] rounded-t-[28px] border border-line bg-surface"
          edges={['bottom']}
          style={{ backgroundColor: palette.surface, maxHeight: '82%', zIndex: 1 }}>
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
      </View>
    </Modal>
  );
}
