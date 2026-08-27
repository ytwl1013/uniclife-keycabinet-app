import { RefreshControl } from 'react-native';

import { useAppTheme } from '@/styles/theme';

export function AppRefreshControl({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { palette } = useAppTheme();

  return (
    <RefreshControl
      colors={[palette.brand]}
      onRefresh={onRefresh}
      progressBackgroundColor={palette.surface}
      refreshing={refreshing}
      tintColor={palette.brand}
    />
  );
}
