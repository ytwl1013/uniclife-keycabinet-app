import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AppColors } from '@/styles/theme';

export default function TeamTab() {
  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.panel}>
        <MaterialIcons color={AppColors.blue} name="groups" size={56} />
        <Text style={styles.title}>Team</Text>
        <Text style={styles.copy}>Demo placeholder for access groups, roles, and user authorization workflows.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  panel: {
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderColor: AppColors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 28,
  },
  title: {
    color: AppColors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  copy: {
    color: AppColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
});
