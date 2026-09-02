import { InputAccessoryView, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

export function CheckoutKeyboardAccessories({
  disabled,
  label,
  nativeIDs,
  onPress,
}: {
  disabled: boolean;
  label: string;
  nativeIDs: readonly string[];
  onPress: () => void;
}) {
  if (process.env.EXPO_OS !== 'ios') return null;

  return nativeIDs.map((nativeID) => (
    <InputAccessoryView backgroundColor="transparent" key={nativeID} nativeID={nativeID}>
      <View className="h-10 justify-center bg-transparent">
        <View className="mx-auto w-full max-w-content items-end px-screen">
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            className={`h-8 justify-center rounded-pill bg-brand px-3 shadow-card ${disabled ? 'opacity-40' : 'active:opacity-75'}`}
            disabled={disabled}
            hitSlop={6}
            onPress={onPress}>
            <AppText variant="caption" tone="onBrand">{label}</AppText>
          </Pressable>
        </View>
      </View>
    </InputAccessoryView>
  ));
}
