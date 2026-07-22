import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentClassName?: string;
  keyboardAware?: boolean;
}>;

const baseContentClassName = 'mx-auto w-full max-w-content gap-section px-screen pt-screen pb-screen';

export function AppScreen({ children, scroll = true, contentClassName = '', keyboardAware = false }: AppScreenProps) {
  const content = scroll ? (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        automaticallyAdjustKeyboardInsets={keyboardAware}
        className="flex-1"
        contentContainerClassName={`${baseContentClassName} ${contentClassName}`}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  ) : (
    <SafeAreaView className="flex-1 bg-background">
      <View className={`${baseContentClassName} flex-1 ${contentClassName}`}>{children}</View>
    </SafeAreaView>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={8}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
