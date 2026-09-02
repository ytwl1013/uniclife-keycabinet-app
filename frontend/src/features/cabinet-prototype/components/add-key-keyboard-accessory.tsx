import { InputAccessoryView, View } from 'react-native';

import { ActionButton } from '@/features/cabinet-prototype/components/prototype-ui';

export function AddKeyKeyboardAccessories({
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
      <View className="border-t border-line bg-background px-screen py-2">
        <View className="mx-auto w-full max-w-content">
          <ActionButton disabled={disabled} icon="key" label={label} onPress={onPress} />
        </View>
      </View>
    </InputAccessoryView>
  ));
}
