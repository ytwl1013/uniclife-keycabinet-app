import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/styles/theme';

import { AppIcon, AppIconName } from './app-icon';

export function SearchBox({ placeholder, trailingIcon }: { placeholder: string; trailingIcon?: AppIconName }) {
  const { palette } = useAppTheme();

  return (
    <View className="min-h-[52px] flex-1 flex-row items-center gap-2.5 rounded-control border border-line bg-surface px-controlX">
      <AppIcon name="search" size={23} tone="muted" />
      <TextInput
        accessibilityLabel={placeholder}
        className="flex-1 text-body text-content"
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
      />
      {trailingIcon ? <AppIcon name={trailingIcon} size={22} tone="muted" /> : null}
    </View>
  );
}
