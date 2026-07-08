import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/styles/theme';

export function SearchBox({ placeholder, trailingIcon }: { placeholder: string; trailingIcon?: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.searchBox}>
      <MaterialIcons color={AppColors.muted} name="search" size={23} />
      <Text style={styles.placeholder}>{placeholder}</Text>
      {trailingIcon ? <MaterialIcons color={AppColors.muted} name={trailingIcon} size={22} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  placeholder: {
    color: AppColors.muted,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
