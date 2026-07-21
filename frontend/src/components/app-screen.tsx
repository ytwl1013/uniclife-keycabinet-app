import { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentClassName?: string;
}>;

const baseContentClassName = 'mx-auto w-full max-w-content gap-section px-screen pt-screen pb-tabBarBottom';

export function AppScreen({ children, scroll = true, contentClassName = '' }: AppScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className={`${baseContentClassName} flex-1 ${contentClassName}`}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName={`${baseContentClassName} ${contentClassName}`} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
