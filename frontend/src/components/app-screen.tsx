import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/styles/theme';

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, scroll = true, contentStyle }: AppScreenProps) {
  if (!scroll) {
    return <SafeAreaView style={[styles.safeArea, contentStyle]}>{children}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppColors.appBackground,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 480,
    padding: 20,
    paddingBottom: 110,
    width: '100%',
  },
});
