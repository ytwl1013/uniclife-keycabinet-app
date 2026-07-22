import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScaffoldProps = PropsWithChildren<{
  contentClassName?: string;
  footer?: ReactNode;
  header?: ReactNode;
  keyboardAware?: boolean;
  scroll?: boolean;
  tabBarAware?: boolean;
}>;

const contentBaseClassName = 'mx-auto w-full max-w-content gap-section px-screen pb-screen';

export function AppScaffold({
  children,
  contentClassName = '',
  footer,
  header,
  keyboardAware = false,
  scroll = true,
  tabBarAware = true,
}: AppScaffoldProps) {
  const body = scroll ? (
    <ScrollView
      automaticallyAdjustKeyboardInsets={keyboardAware}
      className="min-w-0 flex-1"
      contentContainerClassName={`${contentBaseClassName} pt-screen ${contentClassName}`}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View className={`${contentBaseClassName} min-w-0 flex-1 ${contentClassName}`}>
      {children}
    </View>
  );

  const screen = (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {header ? (
        <View className="border-b border-line bg-background">
          <View className="mx-auto w-full max-w-content px-screen py-3">{header}</View>
        </View>
      ) : null}

      {body}

      {footer ? (
        <SafeAreaView
          className="border-t border-line bg-background"
          edges={tabBarAware ? [] : ['bottom']}>
          <View className="mx-auto w-full max-w-content px-screen py-3">{footer}</View>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );

  if (!keyboardAware) return screen;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={0}>
      {screen}
    </KeyboardAvoidingView>
  );
}

export type { AppScaffoldProps };
