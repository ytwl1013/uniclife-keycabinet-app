import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/styles/theme';

type PillTone = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple';

const toneStyles = {
  blue: { backgroundColor: AppColors.blue, color: '#ffffff', borderColor: AppColors.blue },
  green: { backgroundColor: AppColors.greenSoft, color: '#13a66f', borderColor: '#c9f4df' },
  orange: { backgroundColor: AppColors.orangeSoft, color: '#d97809', borderColor: '#ffe1b7' },
  red: { backgroundColor: AppColors.redSoft, color: AppColors.red, borderColor: '#ffd0ca' },
  gray: { backgroundColor: '#f4f6fa', color: AppColors.muted, borderColor: AppColors.line },
  purple: { backgroundColor: AppColors.purpleSoft, color: AppColors.purple, borderColor: '#e4d4ff' },
};

export function Pill({ children, tone = 'gray' }: PropsWithChildren<{ tone?: PillTone }>) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }]}>
      <Text style={[styles.text, { color: toneStyle.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
