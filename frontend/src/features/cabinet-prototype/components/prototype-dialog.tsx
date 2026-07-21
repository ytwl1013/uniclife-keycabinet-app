import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/styles/theme';

type DialogTone = 'brand' | 'danger';

type DialogOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

/**
 * React Native Web's Alert API does not reliably execute button callbacks.
 * This in-app dialog keeps confirmation flows identical and testable on Web,
 * iOS, and Android.
 */
export function usePrototypeDialog(): {
  present: (options: DialogOptions) => Promise<boolean>;
  dialog: ReactNode;
} {
  const { palette } = useAppTheme();
  const [options, setOptions] = useState<DialogOptions>();
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    setOptions(undefined);
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(confirmed);
  }, []);

  const present = useCallback((nextOptions: DialogOptions) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  useEffect(() => () => resolver.current?.(false), []);

  const dialog = options ? (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (options.cancelLabel) finish(false);
      }}
      transparent
      visible>
      <View accessibilityViewIsModal className="flex-1 items-center justify-center px-5 py-8" style={{ backgroundColor: 'rgba(6, 17, 38, 0.58)' }}>
        <View className="w-full max-w-[430px] gap-4 rounded-card border p-5 shadow-card" style={{ backgroundColor: palette.surface, borderColor: palette.line }}>
          <View className="flex-row items-start gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-pill" style={{ backgroundColor: options.tone === 'danger' ? palette.dangerSoft : palette.brandSoft }}>
              <AppIcon name={options.tone === 'danger' ? 'error' : 'shield'} size={23} tone={options.tone === 'danger' ? 'danger' : 'brand'} />
            </View>
            <View className="min-w-0 flex-1 gap-1.5">
              <AppText accessibilityRole="header" style={{ color: palette.foreground }} variant="title" tone="foreground">{options.title}</AppText>
              <AppText style={{ color: palette.content }} variant="body" tone="content">{options.description}</AppText>
            </View>
          </View>
          <View className="gap-2.5">
            <Pressable
              accessibilityRole="button"
              className="min-h-[50px] flex-row items-center justify-center gap-2 rounded-control border px-4 active:opacity-75"
              onPress={() => finish(true)}
              style={{ backgroundColor: options.tone === 'danger' ? palette.danger : palette.brand, borderColor: options.tone === 'danger' ? palette.danger : palette.brand }}>
              <AppIcon name={options.tone === 'danger' ? 'error' : 'shield'} size={21} color={palette.onBrand} />
              <AppText className="text-center" style={{ color: palette.onBrand }} variant="label" tone="onBrand">{options.confirmLabel}</AppText>
            </Pressable>
            {options.cancelLabel ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-[50px] items-center justify-center rounded-control border px-4 active:opacity-75"
                onPress={() => finish(false)}
                style={{ backgroundColor: palette.surface, borderColor: palette.line }}>
                <AppText className="text-center" style={{ color: palette.foreground }} variant="label" tone="foreground">{options.cancelLabel}</AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  return { present, dialog };
}
